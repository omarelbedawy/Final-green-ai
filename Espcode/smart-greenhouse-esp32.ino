#include "WiFi.h"
#include "WiFiManager.h"
#include "HTTPClient.h"
#include "ArduinoJson.h"
#include "DHT.h"
#include "esp_camera.h"

// Pin definitions
#define PUMP_PIN 4
#define FAN_PIN 14
#define GROW_LIGHT_PIN 15
#define DHT_PIN 13
#define SOIL_MOISTURE_PIN 32
#define LDR_PIN 33
#define MQ2_PIN 34

#define DHTTYPE DHT22

// Camera pin definitions for AI-Thinker ESP32-CAM
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

DHT dht(DHT_PIN, DHTTYPE);

// Backend details
const char* backendUrl = "https://final-green-ai.vercel.app";
const char* apiKey = "Green-AI"; 
const char* deviceId = "ESP_CAM_SMARTGREENHOUSE_001";

// Timers
unsigned long lastReadingTime = 0;
unsigned long lastPhotoTime = 0;
const long readingInterval = 10000; // 10 seconds
const long photoInterval = 3600000; // 1 hour

void setup() {
  Serial.begin(115200);

  pinMode(PUMP_PIN, OUTPUT);
  pinMode(FAN_PIN, OUTPUT);
  pinMode(GROW_LIGHT_PIN, OUTPUT);

  dht.begin();
  
  // Initialize camera
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

  // WiFi Manager
  WiFiManager wm;
  wm.setAPStaticIP(IPAddress(192, 168, 4, 1));
  wm.setTitle("Green-AI-Device");
  if (!wm.autoConnect("Green-AI-Device", "password")) {
    Serial.println("Failed to connect and hit timeout");
    ESP.restart();
  }
  Serial.println("Connected to WiFi!");
}

void sendSensorReadings(float temp, float humidity, int soil, int light, int mq2, String pumpState, String fanState, String lightState) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(backendUrl) + "/api/readings";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<256> doc;
    doc["deviceId"] = deviceId;
    doc["temperature"] = temp;
    doc["humidity"] = humidity;
    doc["soilMoisture"] = soil;
    doc["light"] = light;
    doc["mq2"] = mq2;
    doc["pumpState"] = pumpState;
    doc["fanState"] = fanState;
    doc["growLedState"] = lightState;

    String requestBody;
    serializeJson(doc, requestBody);

    int httpResponseCode = http.POST(requestBody);
    if (httpResponseCode > 0) {
      Serial.printf("Readings POST response code: %d\n", httpResponseCode);
    } else {
      Serial.printf("Readings POST failed, error: %s\n", http.errorToString(httpResponseCode).c_str());
    }
    http.end();
  }
}

void captureAndUploadPhoto() {
  if (WiFi.status() == WL_CONNECTED) {
    camera_fb_t * fb = NULL;
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Camera capture failed");
      return;
    }

    HTTPClient http;
    String url = String(backendUrl) + "/api/diagnose";
    http.begin(url);

    String boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
    http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

    String body_prefix = "--" + boundary + "\r\n";
    body_prefix += "Content-Disposition: form-data; name=\"photo\"; filename=\"plant.jpg\"\r\n";
    body_prefix += "Content-Type: image/jpeg\r\n\r\n";
    
    String body_suffix = "\r\n--" + boundary + "--\r\n";

    size_t total_len = body_prefix.length() + fb->len + body_suffix.length();
    
    uint8_t *big_buffer = new uint8_t[total_len];
    if(!big_buffer){
        Serial.println("Failed to allocate buffer for upload");
        esp_camera_fb_return(fb);
        return;
    }

    memcpy(big_buffer, body_prefix.c_str(), body_prefix.length());
    memcpy(big_buffer + body_prefix.length(), fb->buf, fb->len);
    memcpy(big_buffer + body_prefix.length() + fb->len, body_suffix.c_str(), body_suffix.length());

    int httpResponseCode = http.POST(big_buffer, total_len);

    delete[] big_buffer;
    esp_camera_fb_return(fb);

    if (httpResponseCode > 0) {
      Serial.printf("Diagnosis photo POST response code: %d\n", httpResponseCode);
      String payload = http.getString();
      Serial.println(payload);
    } else {
      Serial.printf("Diagnosis photo POST failed, error: %s\n", http.errorToString(httpResponseCode).c_str());
    }

    http.end();
  }
}


void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - lastReadingTime >= readingInterval) {
    lastReadingTime = currentMillis;

    float h = dht.readHumidity();
    float t = dht.readTemperature();
    int soilMoisture = analogRead(SOIL_MOISTURE_PIN);
    int ldrValue = analogRead(LDR_PIN);
    int mq2Value = analogRead(MQ2_PIN);

    // Dummy states for now
    String pumpState = "OFF";
    String fanState = "OFF";
    String growLedState = "ON";

    sendSensorReadings(t, h, soilMoisture, ldrValue, mq2Value, pumpState, fanState, growLedState);
  }
  
  if (currentMillis - lastPhotoTime >= photoInterval) {
    lastPhotoTime = currentMillis;
    // This function will take a picture and send it to the backend for diagnosis.
    // Uncomment this line on your actual hardware.
    // captureAndUploadPhoto(); 
  }
}
