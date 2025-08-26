/**
 * =================================================================
 * Green-AI ESP32-CAM Firmware
 * =================================================================
 * This firmware is designed to work with the Green-AI Next.js web application.
 *
 * Features:
 * - Connects to Wi-Fi using WiFiManager for easy setup.
 * - Reads sensor data: DHT22 (temp/humidity), Soil Moisture, LDR (light), MQ2 (gas).
 * - Controls actuators: Water Pump, Fan, Grow LED.
 * - Fetches AI-generated plant care thresholds dynamically from the Green-AI backend.
 * - Sends sensor and actuator status to the backend periodically.
 * - Captures and sends images to the backend for AI-powered disease diagnosis.
 * - Uses a secure API key for authenticating with the backend.
 * - Provides a live MJPEG video stream over Wi-Fi.
 *
 * @author Omar Elbedawy (Original Author), AI Assistant (Firmware Refactor)
 * @version 2.0.0
 * =================================================================
 */

// Core Libraries
#include "WiFi.h"
#include "WebServer.h"
#include "esp_camera.h"
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Sensor & MJPEG Stream Libraries
#include "DHT.h"
#include "ESPmjpeg.h"

// Disable Brownout Detector for stability
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ========= CONFIGURATION (SET THESE VALUES) =========
// The base URL of your deployed Green-AI web application
const char* backendUrl = "https://YOUR_VERCEL_APP_URL.vercel.app"; 

// A unique identifier for this specific ESP32 device
const char* deviceId = "green-ai-device-001"; 

// The name of the plant this device is monitoring. This MUST match the plantName 
// used on the dashboard to fetch the correct thresholds.
const char* plantName = "Tomato"; // Example: "Monstera Deliciosa", "Tomato", "Rose"

// The secure API key for your backend. This MUST be set as an environment
// variable in your Vercel project with the key "ESP_API_KEY".
const char* apiKey = "YOUR_SECRET_API_KEY"; 


// ========= ESP32-CAM PIN DEFINITIONS =========
#define PWDN_GPIO_NUM    32
#define RESET_GPIO_NUM   -1
#define XCLK_GPIO_NUM    0
#define SIOD_GPIO_NUM    26
#define SIOC_GPIO_NUM    27
#define Y9_GPIO_NUM      35
#define Y8_GPIO_NUM      34
#define Y7_GPIO_NUM      39
#define Y6_GPIO_NUM      36
#define Y5_GPIO_NUM      21
#define Y4_GPIO_NUM      19
#define Y3_GPIO_NUM      18
#define Y2_GPIO_NUM      5
#define VSYNC_GPIO_NUM   25
#define HREF_GPIO_NUM    23
#define PCLK_GPIO_NUM    22
#define LED_BUILTIN_GPIO 33 
#define FLASH_LED_GPIO   4  

// ========= SENSOR & ACTUATOR PIN DEFINITIONS =========
#define SOIL_MOISTURE_PIN 34
#define LDR_PIN           32
#define FAN_PIN           14     
#define PUMP_PIN          12    
#define GROW_LED_PIN      13 
#define DHT_PIN           15
#define DHT_TYPE          DHT22

// ========= GLOBAL VARIABLES =========
// Default thresholds (will be overwritten by values from the backend)
int soilDryThreshold = 3000;
int tempThreshold    = 30;
int lightThreshold   = 1000;

// Sensor & State Variables
DHT dht(DHT_PIN, DHT_TYPE);
WebServer server(80);
ESPmjpegClass espMjpeg;

// Timers for non-blocking operations
unsigned long lastThresholdsUpdate = 0;
unsigned long lastSensorSend = 0;
unsigned long lastImageSend = 0;

// =================================================================
//               CAMERA INITIALIZATION
// =================================================================
void startCameraServer() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_siod = SIOD_GPIO_NUM;
  config.pin_sioc = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_LATEST;
  config.frame_size = FRAMESIZE_QVGA; // Small resolution for fast streaming
  config.jpeg_quality = 12; // Lower quality for faster streaming
  config.fb_count = 2;

  if (espMjpeg.init(config)) {
    Serial.println("Camera successfully initialized");
    server.on("/stream", espMjpeg.stream); // Start the MJPEG stream
  } else {
    Serial.println("Camera init failed");
  }
}

// =================================================================
//               BACKEND COMMUNICATION
// =================================================================

/**
 * @brief Fetches plant care thresholds from the backend API.
 */
void fetchThresholds() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(backendUrl) + "/api/thresholds?plantName=" + String(plantName);
  http.begin(url);
  http.addHeader("x-api-key", apiKey);

  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    Serial.println("Successfully fetched thresholds: " + payload);

    StaticJsonDocument<256> doc;
    deserializeJson(doc, payload);

    // Update global threshold variables with values from the server
    soilDryThreshold = doc["soilDryThreshold"] | soilDryThreshold;
    tempThreshold = doc["tempThreshold"] | tempThreshold;
    lightThreshold = doc["lightThreshold"] | lightThreshold;
    
  } else {
    Serial.printf("[HTTP] GET... failed, error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

/**
 * @brief Sends sensor readings and actuator states to the backend.
 */
void sendReadings(float temp, float hum, int soil, int light, bool fan, bool pump, bool led) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(String(backendUrl) + "/api/readings");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", apiKey);

  StaticJsonDocument<256> doc;
  doc["deviceId"] = deviceId;
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  doc["soilMoisture"] = soil;
  doc["lightLevel"] = light;
  doc["fanState"] = fan;
  doc["pumpState"] = pump;
  doc["growLedState"] = led;

  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = http.POST(requestBody);
  if (httpCode > 0) {
    Serial.printf("[HTTP] POST... code: %d\n", httpCode);
    Serial.println("Readings sent: " + requestBody);
  } else {
    Serial.printf("[HTTP] POST... failed, error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

/**
 * @brief Captures and sends an image to the backend for diagnosis.
 */
void sendImageForDiagnosis() {
  if (WiFi.status() != WL_CONNECTED) return;
  Serial.println("Capturing image for diagnosis...");

  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return;
  }

  HTTPClient http;
  http.begin(String(backendUrl) + "/api/diagnose");
  http.addHeader("x-api-key", apiKey);
  // The server expects multipart/form-data, but we send it as a direct octet-stream
  // and handle it on the server. For a more robust solution, a multipart library would be better.
  
  // Construct a minimal multipart/form-data body by hand
  String boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
  String head = "--" + boundary + "\r\n" +
                "Content-Disposition: form-data; name=\"photo\"; filename=\"plant.jpg\"\r\n" +
                "Content-Type: image/jpeg\r\n\r\n";
  String tail = "\r\n--" + boundary + "--\r\n";

  // We need to build the full request body in memory
  size_t body_len = head.length() + fb->len + tail.length();
  uint8_t *body_buf = (uint8_t*) malloc(body_len);
  
  // Copy parts into the buffer
  memcpy(body_buf, head.c_str(), head.length());
  memcpy(body_buf + head.length(), fb->buf, fb->len);
  memcpy(body_buf + head.length() + fb->len, tail.c_str(), tail.length());
  
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
  
  int httpCode = http.POST(body_buf, body_len);
  
  if (httpCode > 0) {
    Serial.printf("Image sent, server responded with code: %d\n", httpCode);
    String response = http.getString();
    Serial.println("Diagnosis Response: " + response);
  } else {
    Serial.printf("Error sending image: %s\n", http.errorToString(httpCode).c_str());
  }

  esp_camera_fb_return(fb);
  free(body_buf);
  http.end();
}

// =================================================================
//               MAIN DEVICE LOGIC
// =================================================================

/**
 * @brief Controls actuators based on sensor values and thresholds.
 * @return A struct containing the current state of all actuators.
 */
struct ActuatorStates { bool pump; bool fan; bool growLed; };
ActuatorStates handleActuators(int soil, int light, float temp) {
  ActuatorStates states;

  // Pump Control
  states.pump = (soil > soilDryThreshold);
  digitalWrite(PUMP_PIN, states.pump ? HIGH : LOW);

  // Fan Control (based on temperature only now)
  states.fan = (temp > tempThreshold);
  digitalWrite(FAN_PIN, states.fan ? HIGH : LOW);

  // Grow LED Control
  states.growLed = (light < lightThreshold);
  digitalWrite(GROW_LED_PIN, states.growLed ? HIGH : LOW);
  
  return states;
}

/**
 * @brief Connects to WiFi using the WiFiManager portal.
 */
void connectToWiFi() {
  WiFi.mode(WIFI_STA);
  WiFiManager wm;
  wm.setConfigPortalTimeout(180); // Portal will stay active for 3 minutes

  bool res = wm.autoConnect("Green-AI-Device", "password"); // AP name and password

  if (!res) {
    Serial.println("Failed to connect to WiFi... restarting.");
    ESP.restart();
  } else {
    Serial.println("WiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    digitalWrite(LED_BUILTIN_GPIO, LOW); // Turn off blue LED to indicate connection
  }
}

// =================================================================
//               SETUP & LOOP
// =================================================================
void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // Disable brownout detector
  Serial.begin(115200);

  // Initialize Actuator and LED pins
  pinMode(FAN_PIN, OUTPUT);
  pinMode(PUMP_PIN, OUTPUT);
  pinMode(GROW_LED_PIN, OUTPUT);
  pinMode(FLASH_LED_GPIO, OUTPUT);
  pinMode(LED_BUILTIN_GPIO, OUTPUT);

  // Set initial states
  digitalWrite(FAN_PIN, LOW);
  digitalWrite(PUMP_PIN, LOW);
  digitalWrite(GROW_LED_PIN, LOW);
  digitalWrite(FLASH_LED_GPIO, LOW);
  digitalWrite(LED_BUILTIN_GPIO, HIGH); // Blue LED ON indicates not connected

  dht.begin();
  
  connectToWiFi();
  startCameraServer();
  
  // Fetch the initial set of thresholds from the backend
  fetchThresholds(); 
  
  server.begin();
}

void loop() {
  server.handleClient(); // Handle web server requests for the video stream

  // --- Sensor Reading ---
  int soilMoisture = analogRead(SOIL_MOISTURE_PIN);
  int lightLevel = analogRead(LDR_PIN);
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  // Check for invalid sensor readings
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Failed to read from DHT sensor!");
  } else {
     Serial.printf("Sensors - Soil: %d, Light: %d, Temp: %.2f°C, Hum: %.2f%%\n", 
                soilMoisture, lightLevel, temperature, humidity);
  }

  // --- Actuator Control ---
  ActuatorStates currentStates = handleActuators(soilMoisture, lightLevel, temperature);
  
  // --- Timed Backend Communication ---
  unsigned long now = millis();

  // Send sensor readings every 10 seconds
  if (now - lastSensorSend > 10000) {
    lastSensorSend = now;
    if (!isnan(temperature)) { // Only send valid data
       sendReadings(temperature, humidity, soilMoisture, lightLevel, 
                   currentStates.fan, currentStates.pump, currentStates.growLed);
    }
  }

  // Send an image for diagnosis every hour
  if (now - lastImageSend > 3600000) { 
    lastImageSend = now;
    sendImageForDiagnosis();
  }

  // Update thresholds every 5 minutes
  if (now - lastThresholdsUpdate > 300000) { 
    lastThresholdsUpdate = now;
    fetchThresholds();
  }

  delay(2000); // Main loop delay
}
