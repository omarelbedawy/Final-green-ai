/*
  Green-AI: Smart Greenhouse System
  Firmware for ESP32-CAM
  Author: Omar Elbedawy
  Date: July 2024

  Features:
  - Connects to Wi-Fi using WiFiManager for easy setup.
  - Reads sensors: DHT22 (temp/humidity), Soil Moisture, LDR (light), MQ-2 (gas).
  - Controls actuators: Water Pump, Fan, Grow Light via relays.
  - Fetches control thresholds and settings from a backend server.
  - Posts sensor readings to the backend.
  - Periodically captures and uploads a photo for AI diagnosis.
  - Provides a live MJPEG video stream.
*/

#include <WiFi.h>
#include <WebServer.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include "esp_camera.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ESP32-CAM (AI-Thinker) Pinout
#define CAM_PIN_PWDN 32
#define CAM_PIN_RESET -1 // NC
#define CAM_PIN_XCLK 0
#define CAM_PIN_SIOD 26
#define CAM_PIN_SIOC 27
#define CAM_PIN_D7 35
#define CAM_PIN_D6 34
#define CAM_PIN_D5 39
#define CAM_PIN_D4 36
#define CAM_PIN_D3 21
#define CAM_PIN_D2 19
#define CAM_PIN_D1 18
#define CAM_PIN_D0 5
#define CAM_PIN_VSYNC 25
#define CAM_PIN_HREF 23
#define CAM_PIN_PCLK 22

// Sensor & Relay Pins
#define DHT_PIN 15
#define SOIL_MOISTURE_PIN 13
#define LDR_PIN 12
#define MQ2_PIN 14
#define PUMP_PIN 2
#define FAN_PIN 4
#define GROW_LIGHT_PIN 16

#define DHT_TYPE DHT22

// Backend Configuration
const char* backendUrl = "https://final-green-ai.vercel.app";
const char* deviceId = "ESP_CAM_SMARTGREENHOUSE_001";
const char* espApiKey = "Green-AI"; 

// Globals for controls and thresholds
bool autoIrrigation = true;
bool nightLight = false;
float soilDryThreshold = 40.0;
float tempThreshold = 30.0;
float mq2Threshold = 300.0;
float lightThreshold = 500.0;

// Timers
unsigned long lastReadingTime = 0;
unsigned long lastPhotoTime = 0;
unsigned long lastConfigTime = 0;
const long readingInterval = 10000;    // 10 seconds
const long photoInterval = 300000;     // 5 minutes
const long configInterval = 60000;     // 1 minute

DHT dht(DHT_PIN, DHT_TYPE);
WebServer server(80);

void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // Disable brownout detector
  Serial.begin(115200);
  Serial.println("Starting Green-AI Device...");

  // Initialize sensors and relays
  dht.begin();
  pinMode(SOIL_MOISTURE_PIN, INPUT);
  pinMode(LDR_PIN, INPUT);
  pinMode(MQ2_PIN, INPUT);
  pinMode(PUMP_PIN, OUTPUT);
  pinMode(FAN_PIN, OUTPUT);
  pinMode(GROW_LIGHT_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, LOW);
  digitalWrite(FAN_PIN, LOW);
  digitalWrite(GROW_LIGHT_PIN, LOW);
  
  // Wi-Fi Manager Setup
  WiFiManager wm;
  wm.setAPCallback(configModeCallback);
  if (!wm.autoConnect("Green-AI-Device", "password")) {
    Serial.println("Failed to connect and hit timeout");
    ESP.restart();
  }
  Serial.println("Connected to Wi-Fi!");

  // Camera Setup
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = CAM_PIN_D0;
  config.pin_d1 = CAM_PIN_D1;
  config.pin_d2 = CAM_PIN_D2;
  config.pin_d3 = CAM_PIN_D3;
  config.pin_d4 = CAM_PIN_D4;
  config.pin_d5 = CAM_PIN_D5;
  config.pin_d6 = CAM_PIN_D6;
  config.pin_d7 = CAM_PIN_D7;
  config.pin_xclk = CAM_PIN_XCLK;
  config.pin_pclk = CAM_PIN_PCLK;
  config.pin_vsync = CAM_PIN_VSYNC;
  config.pin_href = CAM_PIN_HREF;
  config.pin_sccb_sda = CAM_PIN_SIOD;
  config.pin_sccb_scl = CAM_PIN_SIOC;
  config.pin_pwdn = CAM_PIN_PWDN;
  config.pin_reset = CAM_PIN_RESET;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_VGA;
  config.jpeg_quality = 12;
  config.fb_count = 1;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }
  
  // Web Server for Video Stream
  startCameraServer();
  Serial.println("Camera server started.");

  // Fetch initial configuration
  fetchDeviceConfiguration();
}

void loop() {
  unsigned long currentTime = millis();

  // Fetch remote configuration periodically
  if (currentTime - lastConfigTime >= configInterval) {
    lastConfigTime = currentTime;
    fetchDeviceConfiguration();
  }

  // Send sensor readings periodically
  if (currentTime - lastReadingTime >= readingInterval) {
    lastReadingTime = currentTime;
    SensorReadings readings = readSensors();
    postSensorReadings(readings);
    
    // Automation logic
    if (autoIrrigation) {
        controlActuators(readings);
    }
  }

  // Capture and upload photo periodically
  if (currentTime - lastPhotoTime >= photoInterval) {
    lastPhotoTime = currentTime;
    captureAndUploadPhoto();
  }

  server.handleClient();
}

// --- Sensor and Actuator Functions ---

struct SensorReadings {
  float temperature;
  float humidity;
  int soilMoisture;
  int light;
  int mq2;
};

SensorReadings readSensors() {
  SensorReadings readings;
  readings.temperature = dht.readTemperature();
  readings.humidity = dht.readHumidity();
  readings.soilMoisture = map(analogRead(SOIL_MOISTURE_PIN), 0, 4095, 100, 0);
  readings.light = analogRead(LDR_PIN);
  readings.mq2 = analogRead(MQ2_PIN);
  return readings;
}

void controlActuators(SensorReadings readings) {
  // Pump control
  if (readings.soilMoisture < soilDryThreshold) {
    digitalWrite(PUMP_PIN, HIGH);
  } else {
    digitalWrite(PUMP_PIN, LOW);
  }

  // Fan control
  if (readings.temperature > tempThreshold || readings.mq2 > mq2Threshold) {
    digitalWrite(FAN_PIN, HIGH);
  } else {
    digitalWrite(FAN_PIN, LOW);
  }

  // Light control
  if (nightLight) {
    digitalWrite(GROW_LIGHT_PIN, HIGH);
  } else {
    if (readings.light < lightThreshold) {
      digitalWrite(GROW_LIGHT_PIN, HIGH);
    } else {
      digitalWrite(GROW_LIGHT_PIN, LOW);
    }
  }
}

// --- Wi-Fi Manager ---

void configModeCallback(WiFiManager *myWiFiManager) {
  Serial.println("Entered config mode");
  Serial.println(WiFi.softAPIP());
  Serial.println(myWiFiManager->getConfigPortalSSID());
}

// --- API Communication ---

void fetchDeviceConfiguration() {
  fetchControls();
  fetchThresholds();
}

void fetchControls() {
  WiFiClientSecure client;
  client.setInsecure();
  String url = String(backendUrl) + "/api/controls/" + String(deviceId);
  
  if (client.connect(backendUrl, 443)) {
    client.println("GET " + url + " HTTP/1.1");
    client.println("Host: " + String(backendUrl));
    client.println("Connection: close");
    client.println();

    // Read response
    while (client.connected()) {
      String line = client.readStringUntil('\n');
      if (line == "\r") {
        break;
      }
    }
    String response = client.readString();
    
    DynamicJsonDocument doc(512);
    deserializeJson(doc, response);

    if (doc.containsKey("autoIrrigation")) {
        autoIrrigation = doc["autoIrrigation"];
    }
    if (doc.containsKey("nightLight")) {
        nightLight = doc["nightLight"];
    }
    Serial.println("Fetched controls: AutoIrrigation=" + String(autoIrrigation) + ", NightLight=" + String(nightLight));
  }
}

void fetchThresholds() {
    WiFiClientSecure client;
    client.setInsecure();
    String url = String(backendUrl) + "/api/thresholds?deviceId=" + String(deviceId);

    if (client.connect(backendUrl, 443)) {
        client.println("GET " + url + " HTTP/1.1");
        client.println("Host: " + String(backendUrl));
        client.println("Connection: close");
        client.println();

        while (client.connected()) {
            String line = client.readStringUntil('\n');
            if (line == "\r") break;
        }
        String response = client.readString();
        
        DynamicJsonDocument doc(512);
        deserializeJson(doc, response);

        if (!doc.isNull()) {
            soilDryThreshold = doc["soilDryThreshold"] | soilDryThreshold;
            mq2Threshold = doc["mq2Threshold"] | mq2Threshold;
            tempThreshold = doc["tempThreshold"] | tempThreshold;
            lightThreshold = doc["lightThreshold"] | lightThreshold;
        }
        Serial.println("Fetched thresholds.");
    }
}

void postSensorReadings(SensorReadings readings) {
  WiFiClientSecure client;
  client.setInsecure();
  String url = String(backendUrl) + "/api/readings";

  if (client.connect(backendUrl, 443)) {
    DynamicJsonDocument doc(1024);
    doc["deviceId"] = deviceId;
    doc["temperature"] = readings.temperature;
    doc["humidity"] = readings.humidity;
    doc["soilMoisture"] = readings.soilMoisture;
    doc["light"] = readings.light;
    doc["mq2"] = readings.mq2;
    doc["pumpState"] = digitalRead(PUMP_PIN) ? "ON" : "OFF";
    doc["fanState"] = digitalRead(FAN_PIN) ? "ON" : "OFF";
    doc["growLedState"] = digitalRead(GROW_LIGHT_PIN) ? "ON" : "OFF";
    
    String requestBody;
    serializeJson(doc, requestBody);

    client.println("POST " + url + " HTTP/1.1");
    client.println("Host: " + String(backendUrl));
    client.println("Content-Type: application/json");
    client.println("Content-Length: " + String(requestBody.length()));
    client.println();
    client.print(requestBody);

    Serial.println("Posted sensor readings.");
    // Optional: read response
    while(client.connected()) {
      String line = client.readStringUntil('\n');
      if(line == "\r") break;
    }
    client.stop();
  }
}

void captureAndUploadPhoto() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();

  if (client.connect(backendUrl, 443)) {
    String boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
    String url = String(backendUrl) + "/api/diagnose-esp";
    
    String head = "--" + boundary + "\r\n" +
                  "Content-Disposition: form-data; name=\"photo\"; filename=\"plant.jpg\"\r\n" +
                  "Content-Type: image/jpeg\r\n\r\n";
    String tail = "\r\n--" + boundary + "--\r\n";

    uint32_t contentLength = head.length() + fb->len + tail.length();

    client.println("POST " + url + " HTTP/1.1");
    client.println("Host: " + String(backendUrl));
    client.println("Content-Length: " + String(contentLength));
    client.println("Content-Type: multipart/form-data; boundary=" + boundary);
    client.println();
    client.print(head);

    uint8_t *fb_buf = fb->buf;
    size_t fb_len = fb->len;
    for (size_t n = 0; n < fb_len; n = n + 1024) {
      if (n + 1024 < fb_len) {
        client.write(fb_buf, 1024);
        fb_buf += 1024;
      } else if (fb_len % 1024 > 0) {
        size_t remainder = fb_len % 1024;
        client.write(fb_buf, remainder);
      }
    }
    client.print(tail);
    
    esp_camera_fb_return(fb);

    Serial.println("Uploaded photo for diagnosis.");
    // Optional: read response
    while(client.connected()){
      String line = client.readStringUntil('\n');
      if(line == "\r") break;
    }
    client.stop();
  } else {
    Serial.println("Connection to backend failed for photo upload.");
  }
}


// --- Camera Web Server ---
void startCameraServer(){
  server.on("/", HTTP_GET, handleJpgStream);
  server.on("/jpg", HTTP_GET, handleJpg);
  server.begin();
}

void handleJpgStream(){
  WiFiClient client = server.client();
  String response = "HTTP/1.1 200 OK\r\n";
  response += "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n\r\n";
  server.sendContent(response);

  while(true){
    camera_fb_t *fb = esp_camera_fb_get();
    if(!fb){
      Serial.println("Failed to capture frame");
      break;
    }
    
    response = "--frame\r\n";
    response += "Content-Type: image/jpeg\r\n";
    response += "Content-Length: " + String(fb->len) + "\r\n\r\n";
    server.sendContent(response);

    client.write(fb->buf, fb->len);
    server.sendContent("\r\n");
    
    esp_camera_fb_return(fb);

    if(!client.connected()){
      break;
    }
  }
}

void handleJpg(){
  WiFiClient client = server.client();
  camera_fb_t *fb = esp_camera_fb_get();
  if(!fb){
    Serial.println("Failed to capture frame");
    server.send(500, "text/plain", "Failed to capture frame");
    return;
  }

  String response = "HTTP/1.1 200 OK\r\n";
  response += "Content-Type: image/jpeg\r\n";
  response += "Content-Disposition: inline; filename=capture.jpg\r\n";
  response += "Content-Length: " + String(fb->len) + "\r\n\r\n";
  
  server.sendContent(response);
  client.write(fb->buf, fb->len);
  
  esp_camera_fb_return(fb);
}
