#include "WiFi.h"
#include "WiFiManager.h"
#include "HTTPClient.h"
#include "ArduinoJson.h"
#include "DHT.h"
#include "esp_camera.h"

// Pin definitions
#define DHTPIN 4
#define SOIL_MOISTURE_PIN 32
#define LDR_PIN 33
#define MQ2_PIN 35
#define PUMP_PIN 12
#define FAN_PIN 13
#define GROW_LED_PIN 14
#define NIGHT_LED_PIN 15

// Camera pins for AI-Thinker ESP32-CAM
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22


// Configuration
#define DHTTYPE DHT22
const char* backendUrl = "https://final-green-ai.vercel.app";
const char* deviceId = "ESP_CAM_SMARTGREENHOUSE_001";
const char* apiKey = "Green-AI"; // Should match your Vercel ESP_API_KEY

// Control thresholds (will be fetched from backend)
float tempThreshold = 30.0;
int soilDryThreshold = 40;
int mq2Threshold = 300;
int lightThreshold = 400;

// Control flags
bool autoIrrigation = true;
bool nightLight = false;

// Timers
unsigned long lastReadingTime = 0;
unsigned long lastControlFetchTime = 0;
unsigned long lastDiagnosisTime = 0;
const long readingInterval = 5000; // 5 seconds
const long controlFetchInterval = 10000; // 10 seconds
const long diagnosisInterval = 3600000; // 1 hour

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  
  pinMode(PUMP_PIN, OUTPUT);
  pinMode(FAN_PIN, OUTPUT);
  pinMode(GROW_LED_PIN, OUTPUT);
  pinMode(NIGHT_LED_PIN, OUTPUT);

  dht.begin();
  
  // Connect to Wi-Fi
  connectToWiFi();
  
  // Initialize Camera
  initCamera();

  // Initial fetch of controls
  fetchControls();
}

void loop() {
  unsigned long currentTime = millis();

  // Send sensor readings periodically
  if (currentTime - lastReadingTime >= readingInterval) {
    lastReadingTime = currentTime;
    sendSensorReadings();
  }

  // Fetch remote controls periodically
  if (currentTime - lastControlFetchTime >= controlFetchInterval) {
    lastControlFetchTime = currentTime;
    fetchControls();
  }
  
  // Run automated diagnosis periodically
  if (currentTime - lastDiagnosisTime >= diagnosisInterval) {
    lastDiagnosisTime = currentTime;
    captureAndUploadPhoto();
  }
}

void connectToWiFi() {
  WiFiManager wm;
  wm.setConnectTimeout(20);
  wm.setAPClientCheck(true);
  
  bool res = wm.autoConnect("Green-AI-Device", "password");

  if (!res) {
    Serial.println("Failed to connect to WiFi. Rebooting...");
    ESP.restart();
  } else {
    Serial.println("Connected to WiFi!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  }
}

void initCamera() {
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
  
  // Frame size
  config.frame_size = FRAMESIZE_VGA; // 640x480
  config.jpeg_quality = 12; // 0-63, lower means higher quality
  config.fb_count = 1;

  // Camera init
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }
}


void sendSensorReadings() {
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();
  int soilMoisture = map(analogRead(SOIL_MOISTURE_PIN), 0, 4095, 100, 0);
  int light = map(analogRead(LDR_PIN), 0, 4095, 100, 0);
  int mq2 = analogRead(MQ2_PIN);

  if (isnan(temp) || isnan(humidity)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }
  
  // --- Automation Logic ---
  bool pumpState = false;
  if (autoIrrigation && soilMoisture < soilDryThreshold) {
    digitalWrite(PUMP_PIN, HIGH);
    pumpState = true;
  } else {
    digitalWrite(PUMP_PIN, LOW);
  }

  bool fanState = false;
  if (temp > tempThreshold || mq2 > mq2Threshold) {
    digitalWrite(FAN_PIN, HIGH);
    fanState = true;
  } else {
    digitalWrite(FAN_PIN, LOW);
  }
  
  bool growLedState = false;
  if (light < lightThreshold) {
    digitalWrite(GROW_LED_PIN, HIGH);
    growLedState = true;
  } else {
    digitalWrite(GROW_LED_PIN, LOW);
  }

  digitalWrite(NIGHT_LED_PIN, nightLight ? HIGH : LOW);

  // --- Prepare JSON payload ---
  StaticJsonDocument<256> doc;
  doc["deviceId"] = deviceId;
  doc["temperature"] = temp;
  doc["humidity"] = humidity;
  doc["soilMoisture"] = soilMoisture;
  doc["light"] = light;
  doc["mq2"] = mq2;
  doc["pumpState"] = pumpState ? "ON" : "OFF";
  doc["fanState"] = fanState ? "ON" : "OFF";
  doc["growLedState"] = growLedState ? "ON" : "OFF";

  String jsonBuffer;
  serializeJson(doc, jsonBuffer);

  // --- Send POST request ---
  HTTPClient http;
  String url = String(backendUrl) + "/api/readings";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", apiKey);

  int httpResponseCode = http.POST(jsonBuffer);
  if (httpResponseCode > 0) {
    Serial.printf("Sensor data sent, response: %d\n", httpResponseCode);
  } else {
    Serial.printf("Error sending sensor data, code: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  http.end();
}

void fetchControls() {
  HTTPClient http;
  String url = String(backendUrl) + "/api/controls/" + String(deviceId);
  http.begin(url);
  http.addHeader("x-api-key", apiKey);

  int httpResponseCode = http.GET();
  if (httpResponseCode == 200) {
    String payload = http.getString();
    StaticJsonDocument<200> doc;
    deserializeJson(doc, payload);
    
    autoIrrigation = doc["autoIrrigation"] | true; // Default to true
    nightLight = doc["nightLight"] | false;     // Default to false

    Serial.println("Controls updated.");

  } else {
    Serial.printf("Error fetching controls, code: %d\n", httpResponseCode);
  }
  http.end();
}

void captureAndUploadPhoto() {
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return;
  }

  HTTPClient http;
  String url = String(backendUrl) + "/api/diagnose-esp";
  
  http.begin(url);
  
  // The 'photo' field name must match what the server expects in `req.formData()`
  String boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

  String body_prefix = "--" + boundary + "\r\n";
  body_prefix += "Content-Disposition: form-data; name=\"photo\"; filename=\"plant.jpg\"\r\n";
  body_prefix += "Content-Type: image/jpeg\r\n\r\n";

  String body_suffix = "\r\n--" + boundary + "--\r\n";
  
  size_t total_len = body_prefix.length() + fb->len + body_suffix.length();
  
  http.sendRequest("POST", (uint8_t*)body_prefix.c_str(), body_prefix.length());
  http.sendRequest("POST", (uint8_t*)fb->buf, fb->len);
  http.sendRequest("POST", (uint8_t*)body_suffix.c_str(), body_suffix.length());

  int httpResponseCode = http.end_stream();

  if (httpResponseCode > 0) {
    Serial.printf("Diagnosis photo uploaded, server responded with %d\n", httpResponseCode);
    String response = http.getString();
    Serial.println(response);
  } else {
    Serial.printf("Error uploading photo: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  
  esp_camera_fb_return(fb); // return the frame buffer
}
