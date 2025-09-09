
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiManager.h>
#include <ArduinoJson.h>
#include "esp_camera.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#include "driver/rtc_io.h"
#include <DHT.h>

// WiFi & API Configuration
const char* backendUrl = "https://final-green-ai.vercel.app";
const char* apiKey = "Green-AI"; // Should match your Vercel ESP_API_KEY
String deviceId = "ESP_CAM_SMARTGREENHOUSE_001";

// Pin definitions for ESP32-CAM
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

// Sensor & Actuator Pins
#define DHT_PIN           13
#define SOIL_MOISTURE_PIN 15
#define LDR_PIN           14
#define MQ2_PIN           12
#define PUMP_PIN           4
#define FAN_PIN            2
#define GROW_LED_PIN      -1 // Not used in this example for CAM

#define DHTTYPE DHT22
DHT dht(DHT_PIN, DHTTYPE);

// Control State
bool autoIrrigation = true;
bool nightLight = false;

// Timers
unsigned long lastReadingTime = 0;
unsigned long lastControlCheckTime = 0;
unsigned long lastPhotoTime = 0;
const long readingInterval = 5000;      // 5 seconds
const long controlCheckInterval = 10000; // 10 seconds
const long photoInterval = 300000;     // 5 minutes

void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // Disable brownout detector
  Serial.begin(115200);
  Serial.setDebugOutput(true);

  // Initialize sensors and actuators
  pinMode(PUMP_PIN, OUTPUT);
  pinMode(FAN_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, LOW);
  digitalWrite(FAN_PIN, LOW);
  dht.begin();

  // WiFi Manager Setup
  WiFiManager wm;
  wm.setAPCallback(configModeCallback);
  if (!wm.autoConnect("Green-AI-Device", "password")) {
    Serial.println("Failed to connect and hit timeout");
    ESP.restart();
  }

  Serial.println("Connected to WiFi!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Initialize Camera
  setupCamera();
}

void loop() {
  unsigned long currentTime = millis();

  // Send sensor readings periodically
  if (currentTime - lastReadingTime >= readingInterval) {
    lastReadingTime = currentTime;
    sendSensorReadings();
  }

  // Check for new control settings periodically
  if (currentTime - lastControlCheckTime >= controlCheckInterval) {
    lastControlCheckTime = currentTime;
    fetchControlSettings();
  }
}

void configModeCallback(WiFiManager *myWiFiManager) {
  Serial.println("Entered config mode");
  Serial.println(WiFi.softAPIP());
  Serial.println(myWiFiManager->getConfigPortalSSID());
}

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
  config.jpeg_quality = 12;
  config.fb_count = 1;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }
}


void sendSensorReadings() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi Disconnected. Cannot send readings.");
    return;
  }

  // Read sensors
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();
  int soilMoisture = analogRead(SOIL_MOISTURE_PIN);
  int light = analogRead(LDR_PIN);
  int mq2 = analogRead(MQ2_PIN);

  // Check for NaN values
  if (isnan(temp) || isnan(humidity)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }
  
  // Create JSON document
  JsonDocument doc;
  doc["deviceId"] = deviceId;
  doc["temperature"] = temp;
  doc["humidity"] = humidity;
  doc["soilMoisture"] = map(soilMoisture, 0, 4095, 100, 0); // Invert and map to percentage
  doc["light"] = map(light, 0, 4095, 0, 100);
  doc["mq2"] = mq2;
  doc["pumpState"] = digitalRead(PUMP_PIN) ? "ON" : "OFF";
  doc["fanState"] = digitalRead(FAN_PIN) ? "ON" : "OFF";
  doc["growLedState"] = "OFF"; // Placeholder

  String jsonString;
  serializeJson(doc, jsonString);

  // Send POST request
  HTTPClient http;
  String url = String(backendUrl) + "/api/readings";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", apiKey);

  Serial.println("Sending sensor data to backend...");
  Serial.println(jsonString);
  
  int httpResponseCode = http.POST(jsonString);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    Serial.println(response);
  } else {
    Serial.print("Error on sending POST: ");
    Serial.println(httpResponseCode);
  }

  http.end();
}

void fetchControlSettings() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi Disconnected. Cannot fetch controls.");
        return;
    }

    HTTPClient http;
    String url = String(backendUrl) + "/api/controls/" + deviceId;
    http.begin(url);
    http.addHeader("x-api-key", apiKey);

    int httpResponseCode = http.GET();

    if (httpResponseCode == 200) {
        String payload = http.getString();
        Serial.println("Control settings fetched:");
        Serial.println(payload);

        JsonDocument doc;
        deserializeJson(doc, payload);
        
        // Only update if the key exists in the JSON
        if (doc.containsKey("autoIrrigation")) {
            autoIrrigation = doc["autoIrrigation"];
        }
        if (doc.containsKey("nightLight")) {
            nightLight = doc["nightLight"];
        }

        Serial.printf("Auto Irrigation: %s, Night Light: %s\n", autoIrrigation ? "ON" : "OFF", nightLight ? "ON" : "OFF");

    } else {
        Serial.print("Error fetching controls, HTTP code: ");
        Serial.println(httpResponseCode);
    }
    http.end();
}
