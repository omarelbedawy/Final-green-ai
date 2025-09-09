//Firebase final
#include "WiFi.h"
#include "WiFiClient.h"
#include "WebServer.h"
#include "ESPmjpeg.h"
#include "esp_camera.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "DHT.h"

// ========= 1. CONFIGURE YOUR DETAILS =========
const char* backendUrl = "https://final-green-ai.vercel.app";
const char* plantName = "Tomato"; // The default plant to monitor
const char* apiKey = "Green-AI"; // Your secret API Key

// ========= ESP32-CAM Pins =========
#define PWDN_GPIO_NUM   32
#define RESET_GPIO_NUM  -1
#define XCLK_GPIO_NUM    0
#define SIOD_GPIO_NUM   26
#define SIOC_GPIO_NUM   27
#define Y9_GPIO_NUM     35
#define Y8_GPIO_NUM     34
#define Y7_GPIO_NUM     39
#define Y6_GPIO_NUM     36
#define Y5_GPIO_NUM     21
#define Y4_GPIO_NUM     19
#define Y3_GPIO_NUM     18
#define Y2_GPIO_NUM      5
#define VSYNC_GPIO_NUM  25
#define HREF_GPIO_NUM   23
#define PCLK_GPIO_NUM   22
#define LED_GPIO_NUM     4
#define LED_BUILTIN     33

// ========= Sensors & Actuators =========
#define SOIL_MOISTURE_PIN   34
#define MQ2_PIN             35
#define LDR_PIN             32
#define FAN_PIN             14
#define PUMP_PIN            12
#define GROW_LED_PIN        13

// ========= DHT Sensor =========
#define DHTPIN 15
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// ========= Global State & Thresholds =========
WebServer server(80);
ESPmjpegClass espMjpeg;
String deviceId = "ESP_CAM_SMARTGREENHOUSE_001";
bool wifiConnected = false;
bool pumpState = false;
bool fanState = false;
bool growLedState = false;
bool autoIrrigationEnabled = true;
bool nightLightEnabled = true;
int soilDryThreshold = 2500;
int mq2Threshold = 500;
float tempThreshold = 28.0;
int lightThreshold = 1500;

// ========= Camera Init & Live Stream Setup =========
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
  config.frame_size = FRAMESIZE_QVGA;
  config.jpeg_quality = 12;
  config.fb_count = 2;

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("Error initializing camera");
    return;
  }
  espMjpeg.init(config);
  server.on("/stream", HTTP_GET, []() {
    espMjpeg.stream(&server);
  });
}

// ========= Fetch Remote Control Toggles =========
void fetchControlStates() {
  if (!wifiConnected) return;
  HTTPClient http;
  String url = String(backendUrl) + "/api/controls/" + deviceId;
  http.begin(url);
  int httpResponseCode = http.GET();
  if (httpResponseCode == 200) {
    String payload = http.getString();
    StaticJsonDocument<200> doc;
    deserializeJson(doc, payload);
    if (doc.containsKey("autoIrrigation")) autoIrrigationEnabled = doc["autoIrrigation"];
    if (doc.containsKey("nightLight")) nightLightEnabled = doc["nightLight"];
    Serial.printf("Controls updated: AutoIrrigation=%s, NightLight=%s\n", autoIrrigationEnabled ? "ON" : "OFF", nightLightEnabled ? "ON" : "OFF");
  } else {
    Serial.printf("Error fetching controls. HTTP Code: %d\n", httpResponseCode);
  }
  http.end();
}

// ========= Fetch AI-Generated Thresholds =========
void fetchThresholds() {
  if (!wifiConnected) return;
  HTTPClient http;
  String url = String(backendUrl) + "/api/thresholds?plantName=" + String(plantName);
  http.begin(url);
  int httpResponseCode = http.GET();
  if (httpResponseCode == 200) {
    String payload = http.getString();
    StaticJsonDocument<256> doc;
    deserializeJson(doc, payload);
    soilDryThreshold = doc["soilDryThreshold"] | soilDryThreshold;
    mq2Threshold = doc["mq2Threshold"] | mq2Threshold;
    tempThreshold = doc["tempThreshold"] | tempThreshold;
    lightThreshold = doc["lightThreshold"] | lightThreshold;
    Serial.println("AI thresholds updated successfully.");
  } else {
    Serial.printf("Error fetching thresholds. HTTP Code: %d\n", httpResponseCode);
  }
  http.end();
}

// ========= Send Sensor Telemetry =========
void sendSensorData(float temp, float hum, int soil, int mq2, int light) {
  if (!wifiConnected || isnan(temp) || isnan(hum)) return;
  HTTPClient http;
  http.begin(String(backendUrl) + "/api/readings");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", apiKey);

  StaticJsonDocument<300> doc;
  doc["deviceId"] = deviceId;
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  doc["soilMoisture"] = soil;
  doc["lightLevel"] = light;
  doc["mq2"] = mq2;
  doc["pumpState"] = pumpState ? "ON" : "OFF";
  doc["fanState"] = fanState ? "ON" : "OFF";
  doc["growLedState"] = growLedState ? "ON" : "OFF";

  String requestBody;
  serializeJson(doc, requestBody);
  http.POST(requestBody);
  http.end();
}

// ========= Send Image for Diagnosis =========
void sendImageForDiagnosis() {
  if (!wifiConnected) return;
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return;
  }
  HTTPClient http;
  http.begin(String(backendUrl) + "/api/diagnose");
  http.addHeader("Content-Type", "image/jpeg");
  http.addHeader("x-api-key", apiKey);
  http.addHeader("X-Device-Id", deviceId);

  int httpResponseCode = http.POST(fb->buf, fb->len);
  if (httpResponseCode == 201) {
    Serial.println("Image sent for diagnosis successfully.");
  } else {
    Serial.printf("Error sending image for diagnosis: %d\n", httpResponseCode);
  }
  esp_camera_fb_return(fb);
  http.end();
}

// ========= Control Actuators =========
void handleActuators(int soil, int mq2, int light, float temp) {
  pumpState = (autoIrrigationEnabled && soil > soilDryThreshold);
  digitalWrite(PUMP_PIN, pumpState ? HIGH : LOW);

  fanState = (mq2 > mq2Threshold || temp > tempThreshold);
  digitalWrite(FAN_PIN, fanState ? HIGH : LOW);

  growLedState = (nightLightEnabled && light < lightThreshold);
  digitalWrite(GROW_LED_PIN, growLedState ? HIGH : LOW);
}

// ========= Setup =========
void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  Serial.begin(115200);
  pinMode(FAN_PIN, OUTPUT);
  pinMode(PUMP_PIN, OUTPUT);
  pinMode(GROW_LED_PIN, OUTPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);
  dht.begin();

  WiFiManager wifiManager;
  wifiManager.setAPStaticIP(IPAddress(192, 168, 4, 1));
  wifiManager.setConfigPortalTimeout(180);

  if (!wifiManager.autoConnect("Green-AI-Device", "password")) {
    Serial.println("Failed to connect and hit timeout");
    wifiConnected = false;
  } else {
    Serial.println("WiFi Connected!");
    wifiConnected = true;
    digitalWrite(LED_BUILTIN, LOW);
    startCameraServer();
    server.begin();
    fetchControlStates();
    fetchThresholds();
  }
}

// ========= Main Loop =========
void loop() {
  static unsigned long lastSensorSend = 0, lastControlFetch = 0, lastThresholdFetch = 0, lastImageSend = 0;
  const long sensorInterval = 10000;    // 10 seconds
  const long controlInterval = 30000;   // 30 seconds
  const long thresholdInterval = 3600000; // 1 hour
  const long imageInterval = 1800000;   // 30 minutes

  if (wifiConnected) {
    server.handleClient();
    unsigned long currentMillis = millis();

    if (currentMillis - lastControlFetch > controlInterval) {
      fetchControlStates();
      lastControlFetch = currentMillis;
    }
    if (currentMillis - lastThresholdFetch > thresholdInterval) {
      fetchThresholds();
      lastThresholdFetch = currentMillis;
    }
    if (currentMillis - lastSensorSend > sensorInterval) {
      float temp = dht.readTemperature();
      float hum = dht.readHumidity();
      if (!isnan(temp) && !isnan(hum)) {
        int soil = analogRead(SOIL_MOISTURE_PIN);
        int mq2 = analogRead(MQ2_PIN);
        int light = analogRead(LDR_PIN);
        handleActuators(soil, mq2, light, temp);
        sendSensorData(temp, hum, soil, mq2, light);
      }
      lastSensorSend = currentMillis;
    }
    if (currentMillis - lastImageSend > imageInterval) {
      sendImageForDiagnosis();
      lastImageSend = currentMillis;
    }
  } else {
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    delay(500);
  }
  delay(10);
}