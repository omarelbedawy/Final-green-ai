// Green-AI: Smart Greenhouse Firmware
// Author: Omar Elbedawy

// Core Libraries
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include "esp_camera.h"
#include <ArduinoJson.h>
#include <WiFiManager.h>
#include <HTTPClient.h>

// Sensor Libraries
#include "DHT.h" // For DHT22 Temperature and Humidity Sensor

// Pin Definitions
#define CAMERA_MODEL_AI_THINKER
#include "camera_pins.h"

// --- SENSORS ---
#define DHT_PIN         15  // DHT22 Temperature/Humidity Sensor
#define SOIL_MOISTURE_PIN 33 // Soil Moisture Sensor
#define LDR_PIN         32  // Light Dependent Resistor (LDR)
#define MQ2_PIN         35  // MQ-2 Gas/Air Quality Sensor

// --- ACTUATORS ---
#define PUMP_PIN        12  // Water Pump Relay
#define FAN_PIN         13  // Fan Relay
#define GROW_LIGHT_PIN  14  // Grow Light Relay
#define FLASH_PIN       4   // Camera Flash LED

// Sensor & Control Objects
DHT dht(DHT_PIN, DHT22);

// Backend Configuration
const char* backendUrl = "https://final-green-ai.vercel.app";
const char* deviceId = "ESP_CAM_SMARTGREENHOUSE_001";

// --- State and Thresholds ---
// These values will be updated from the dashboard
float tempThreshold = 30.0;    // Default Temperature threshold (Celsius)
float soilDryThreshold = 40.0; // Default Soil moisture threshold (%)
int   lightThreshold = 500;    // Default Light level threshold (lux)
int   mq2Threshold = 300;      // Default MQ-2 Gas threshold (ppm)

bool autoIrrigation = true; // Master control for automatic watering
bool nightLight = false;    // Master control for turning light on at night

// Timing intervals
unsigned long lastReadingTime = 0;
unsigned long lastPhotoTime = 0;
unsigned long lastConfigTime = 0;
const long readingInterval = 10000;    // 10 seconds
const long photoInterval = 3600000;  // 1 hour
const long configInterval = 60000;   // 1 minute


// ==========================================================
//                     CAMERA SETUP
// ==========================================================
void setupCamera() {
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
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_VGA; // 640x480
  config.jpeg_quality = 12; // 0-63 lower numbers are higher quality
  config.fb_count = 1;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }
}

// ==========================================================
//               WI-FI & INITIAL SETUP
// ==========================================================
void setup() {
  Serial.begin(115200);
  dht.begin();
  
  pinMode(PUMP_PIN, OUTPUT);
  pinMode(FAN_PIN, OUTPUT);
  pinMode(GROW_LIGHT_PIN, OUTPUT);
  pinMode(FLASH_PIN, OUTPUT);

  digitalWrite(PUMP_PIN, LOW); // Default to OFF
  digitalWrite(FAN_PIN, LOW);
  digitalWrite(GROW_LIGHT_PIN, LOW);
  
  // Setup Wi-Fi Manager
  WiFiManager wm;
  wm.setAPStaticIP(IPAddress(192, 168, 4, 1));
  wm.setConnectTimeout(20);
  wm.setSaveConfigCallback([](){
    Serial.println("Wi-Fi credentials saved.");
  });

  bool res = wm.autoConnect("Green-AI-Device", "password");
  if(!res) {
      Serial.println("Failed to connect to Wi-Fi. Please restart.");
      ESP.restart();
  } else {
      Serial.println("Connected to Wi-Fi successfully!");
      Serial.print("IP Address: ");
      Serial.println(WiFi.localIP());
  }

  setupCamera();
  
  // Fetch initial configuration on boot
  fetchThresholds();
  fetchControls();
}


// ==========================================================
//                 SENSOR READING & LOGIC
// ==========================================================
void readSensorsAndPost() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  // Map the 0-4095 reading to a 0-100 percentage
  int soilMoistureRaw = analogRead(SOIL_MOISTURE_PIN);
  int soilMoisture = map(soilMoistureRaw, 0, 4095, 100, 0); 
  int light = analogRead(LDR_PIN);
  int mq2 = analogRead(MQ2_PIN);

  if (isnan(temp) || isnan(hum)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }

  // --- AUTOMATION LOGIC ---
  // Pump Control
  if (autoIrrigation) {
    if (soilMoisture < soilDryThreshold) {
      digitalWrite(PUMP_PIN, HIGH); // Turn pump ON
    } else {
      digitalWrite(PUMP_PIN, LOW); // Turn pump OFF
    }
  } else {
    digitalWrite(PUMP_PIN, LOW); // Ensure pump is off if automation is disabled
  }

  // Fan Control
  if (temp > tempThreshold || mq2 > mq2Threshold) {
    digitalWrite(FAN_PIN, HIGH);
  } else {
    digitalWrite(FAN_PIN, LOW);
  }

  // Grow Light Control
  if (light < lightThreshold) {
      if (nightLight) {
          digitalWrite(GROW_LIGHT_PIN, HIGH); // Night light override
      } else {
          // Normal day/night cycle logic could go here if needed
          digitalWrite(GROW_LIGHT_PIN, LOW);
      }
  } else {
      digitalWrite(GROW_LIGHT_PIN, LOW);
  }

  // --- POST DATA TO BACKEND ---
  WiFiClientSecure client;
  client.setInsecure(); // Use this for simplicity. For production, use certificates.
  HTTPClient http;

  String url = String(backendUrl) + "/api/readings";
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");

  JsonDocument doc;
  doc["deviceId"] = deviceId;
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  doc["soilMoisture"] = soilMoisture;
  doc["light"] = light;
  doc["mq2"] = mq2;
  doc["pumpState"] = (digitalRead(PUMP_PIN) == HIGH) ? "ON" : "OFF";
  doc["fanState"] = (digitalRead(FAN_PIN) == HIGH) ? "ON" : "OFF";
  doc["growLedState"] = (digitalRead(GROW_LIGHT_PIN) == HIGH) ? "ON" : "OFF";

  String requestBody;
  serializeJson(doc, requestBody);

  int httpResponseCode = http.POST(requestBody);
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Readings POST successful. Code: " + String(httpResponseCode));
    Serial.println(response);
  } else {
    Serial.println("Error on POST: " + String(httpResponseCode));
  }
  http.end();
}


// ==========================================================
//               FETCH REMOTE CONFIGURATION
// ==========================================================
void fetchThresholds() {
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    
    String url = String(backendUrl) + "/api/thresholds?deviceId=" + String(deviceId);
    http.begin(client, url);
    
    int httpResponseCode = http.GET();
    if (httpResponseCode == 200) {
        String payload = http.getString();
        Serial.println("Fetched thresholds: " + payload);

        JsonDocument doc;
        deserializeJson(doc, payload);
        
        // Update local variables if the keys exist in the JSON
        if (doc.containsKey("soilDryThreshold")) {
            soilDryThreshold = doc["soilDryThreshold"];
        }
        if (doc.containsKey("mq2Threshold")) {
            mq2Threshold = doc["mq2Threshold"];
        }
        if (doc.containsKey("tempThreshold")) {
            tempThreshold = doc["tempThreshold"];
        }
        if (doc.containsKey("lightThreshold")) {
            lightThreshold = doc["lightThreshold"];
        }
    } else {
        Serial.println("Error fetching thresholds, code: " + String(httpResponseCode));
    }
    http.end();
}

void fetchControls() {
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    
    String url = String(backendUrl) + "/api/controls/" + String(deviceId);
    http.begin(client, url);

    int httpResponseCode = http.GET();
    if (httpResponseCode == 200) {
        String payload = http.getString();
        Serial.println("Fetched controls: " + payload);

        JsonDocument doc;
        deserializeJson(doc, payload);

        if (doc.containsKey("autoIrrigation")) {
            autoIrrigation = doc["autoIrrigation"];
        }
        if (doc.containsKey("nightLight")) {
            nightLight = doc["nightLight"];
        }
    } else {
        Serial.println("Error fetching controls, code: " + String(httpResponseCode));
    }
    http.end();
}

// ==========================================================
//                   DIAGNOSIS UPLOAD
// ==========================================================
void captureAndUploadPhoto() {
  Serial.println("Capturing photo...");
  digitalWrite(FLASH_PIN, HIGH);
  delay(500); // Let the flash stabilize

  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    digitalWrite(FLASH_PIN, LOW);
    return;
  }
  digitalWrite(FLASH_PIN, LOW);

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String url = String(backendUrl) + "/api/diagnose-esp";
  http.begin(client, url);

  String boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

  String body_prefix = "--" + boundary + "\r\n" +
                     "Content-Disposition: form-data; name=\"photo\"; filename=\"plant.jpg\"\r\n" +
                     "Content-Type: image/jpeg\r\n\r\n";
  String body_suffix = "\r\n--" + boundary + "--\r\n";
  
  size_t total_len = body_prefix.length() + fb->len + body_suffix.length();
  
  http.setContentLength(total_len);

  client.print(body_prefix);
  client.write(fb->buf, fb->len);
  client.print(body_suffix);

  int httpCode = http.POST(""); // POST with empty string for streaming
  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("Photo upload successful. Code: " + String(httpCode));
    Serial.println("Diagnosis: " + response);
  } else {
    Serial.println("Error during photo upload: " + String(httpCode));
    Serial.println(http.getString());
  }

  http.end();
  esp_camera_fb_return(fb);
}


// ==========================================================
//                       MAIN LOOP
// ==========================================================
void loop() {
  unsigned long currentTime = millis();

  if (currentTime - lastConfigTime >= configInterval) {
    lastConfigTime = currentTime;
    fetchThresholds();
    fetchControls();
  }

  if (currentTime - lastReadingTime >= readingInterval) {
    lastReadingTime = currentTime;
    readSensorsAndPost();
  }

  if (currentTime - lastPhotoTime >= photoInterval) {
    lastPhotoTime = currentTime;
    captureAndUploadPhoto();
  }
}
