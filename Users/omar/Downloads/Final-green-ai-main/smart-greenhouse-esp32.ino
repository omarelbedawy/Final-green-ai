
#include "WiFi.h"
#include "WebServer.h"
#include "ESPmjpeg.h"
#include "esp_camera.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "DHT.h"

// ========= IMPORTANT: CONFIGURE YOUR DEVICE =========
const char* apiKey = "YOUR_SECRET_API_KEY_HERE"; // MUST match ESP_API_KEY in Vercel
const char* deviceId = "ESP_CAM_SMARTGREENHOUSE_001"; // Must be unique for each device
const char* plantName = "Tomato"; // The default plant name if none is set
// ====================================================


// ========= Backend URL =========
const char* backendUrl = "https://green-ai-final.vercel.app";

// ========= ESP32-CAM Pins =========
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22
#define LED_BUILTIN 33

// ========= Sensors & Actuators =========
#define SOIL_MOISTURE_PIN 34
#define MQ2_PIN 35
#define LDR_PIN 32
#define FAN_PIN 14
#define PUMP_PIN 12
#define GROW_LED_PIN 13

// ========= DHT Sensor =========
#define DHTPIN 15
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// ========= Global State Variables =========
WebServer server(80);
ESPmjpegClass espMjpeg;
bool wifiConnected = false;

// Actuator states
bool pumpState = false;
bool fanState = false;
bool growLedState = false;

// Thresholds (will be updated from backend)
float soilDryThreshold = 3000;
float mq2Threshold = 600;
float tempThreshold = 27;
float lightThreshold = 2000;

// Control flags from web dashboard
bool autoIrrigationEnabled = true;
bool nightLightEnabled = true;


// ===================================
//      CAMERA INITIALIZATION
// ===================================
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
    config.frame_size = FRAMESIZE_QVGA; // Small size for faster uploads
    config.jpeg_quality = 12; // Good quality
    config.fb_count = 2;

    if (esp_camera_init(&config) != ESP_OK) {
        Serial.println("Error initializing camera");
        return;
    }
    espMjpeg.init(config);
    Serial.println("Camera initialized successfully.");
}

// ===================================
//      NETWORK API CALLS
// ===================================

void fetchControlStates() {
    if (!wifiConnected) return;

    HTTPClient http;
    String url = String(backendUrl) + "/api/controls/" + String(deviceId);
    http.begin(url);
    http.addHeader("x-api-key", apiKey);

    int httpResponseCode = http.GET();
    if (httpResponseCode == 200) {
        String payload = http.getString();
        Serial.println("Control states fetched: " + payload);
        StaticJsonDocument<200> doc;
        deserializeJson(doc, payload);

        autoIrrigationEnabled = doc["autoIrrigation"];
        nightLightEnabled = doc["nightLight"];
        
        Serial.printf("Auto Irrigation: %s, Night Light: %s\n", autoIrrigationEnabled ? "ON" : "OFF", nightLightEnabled ? "ON" : "OFF");

    } else {
        Serial.printf("Error fetching control states: %d\n", httpResponseCode);
    }
    http.end();
}

void fetchThresholds() {
    if (!wifiConnected) return;

    HTTPClient http;
    String url = String(backendUrl) + "/api/thresholds?plantName=" + String(plantName);
    http.begin(url);
    http.addHeader("x-api-key", apiKey);

    int httpResponseCode = http.GET();
    if (httpResponseCode == 200) {
        String payload = http.getString();
        Serial.println("Thresholds fetched: " + payload);

        StaticJsonDocument<512> doc;
        deserializeJson(doc, payload);
        
        soilDryThreshold = doc["soilDryThreshold"] | soilDryThreshold;
        mq2Threshold = doc["mq2Threshold"] | mq2Threshold;
        tempThreshold = doc["tempThreshold"] | tempThreshold;
        lightThreshold = doc["lightThreshold"] | lightThreshold;

    } else {
        Serial.printf("Error fetching thresholds: %d\n", httpResponseCode);
    }
    http.end();
}

void sendSensorData(float temp, float hum, int soil, int mq2, int light) {
    if (!wifiConnected) return;

    HTTPClient http;
    http.begin(String(backendUrl) + "/api/readings");
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", apiKey);

    StaticJsonDocument<400> doc;
    doc["deviceId"] = deviceId;
    doc["temperature"] = temp;
    doc["humidity"] = hum;
    doc["soilMoisture"] = soil;
    doc["mq2"] = mq2;
    doc["lightLevel"] = light;
    doc["fanState"] = fanState;
    doc["pumpState"] = pumpState;
    doc["growLedState"] = growLedState;

    String requestBody;
    serializeJson(doc, requestBody);

    int httpResponseCode = http.POST(requestBody);
    if (httpResponseCode == 200) {
        Serial.printf("Sensor data sent: %s\n", requestBody.c_str());
    } else {
        Serial.printf("Error sending sensor data: %d\n", httpResponseCode);
        String payload = http.getString();
        Serial.println(payload);
    }
    http.end();
}

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
    http.addHeader("x-device-id", deviceId);
    
    int httpResponseCode = http.POST(fb->buf, fb->len);

    if (httpResponseCode == 200) {
        Serial.printf("Image sent for diagnosis: %d bytes\n", fb->len);
    } else {
        Serial.printf("Error sending image for diagnosis: %d\n", httpResponseCode);
        String payload = http.getString();
        Serial.println(payload);
    }

    esp_camera_fb_return(fb);
    http.end();
}

// ===================================
//      MAIN LOGIC
// ===================================
void handleActuators(int soil, int mq2, int light, float temp) {
    // --- Pump Control ---
    if (autoIrrigationEnabled) {
        if (soil > soilDryThreshold) {
            digitalWrite(PUMP_PIN, HIGH);
            pumpState = true;
        } else {
            digitalWrite(PUMP_PIN, LOW);
            pumpState = false;
        }
    } else {
        digitalWrite(PUMP_PIN, LOW); // Keep pump off if auto-irrigation is disabled
        pumpState = false;
    }

    // --- Fan Control ---
    if (mq2 > mq2Threshold || temp > tempThreshold) {
        digitalWrite(FAN_PIN, HIGH);
        fanState = true;
    } else {
        digitalWrite(FAN_PIN, LOW);
        fanState = false;
    }

    // --- Grow LED Control ---
    if (nightLightEnabled) {
        if (light < lightThreshold) {
            digitalWrite(GROW_LED_PIN, HIGH);
            growLedState = true;
        } else {
            digitalWrite(GROW_LED_PIN, LOW);
            growLedState = false;
        }
    } else {
        digitalWrite(GROW_LED_PIN, LOW); // Keep light off if night light is disabled
        growLedState = false;
    }
}


void setup() {
    WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // Disable brownout detector
    Serial.begin(115200);

    // Init actuator pins
    pinMode(FAN_PIN, OUTPUT);
    pinMode(PUMP_PIN, OUTPUT);
    pinMode(GROW_LED_PIN, OUTPUT);
    pinMode(LED_BUILTIN, OUTPUT);

    digitalWrite(FAN_PIN, LOW);
    digitalWrite(PUMP_PIN, LOW);
    digitalWrite(GROW_LED_PIN, LOW);
    digitalWrite(LED_BUILTIN, HIGH); // Turn on LED to indicate setup

    dht.begin();
    startCameraServer();

    // WiFi Manager
    WiFiManager wifiManager;
    wifiManager.setConfigPortalTimeout(180);
    if (wifiManager.autoConnect("Green-AI-Device", "12345678")) {
        Serial.println("WiFi Connected!");
        wifiConnected = true;
        digitalWrite(LED_BUILTIN, LOW); // Turn off LED on successful connection
    } else {
        Serial.println("Failed to connect to WiFi.");
        wifiConnected = false;
    }

    if (wifiConnected) {
        // Initial fetch of settings
        fetchThresholds();
        fetchControlStates();
    }
}


void loop() {
    static unsigned long lastSensorSend = 0;
    static unsigned long lastImageSend = 0;
    static unsigned long lastThresholdFetch = 0;
    static unsigned long lastControlsFetch = 0;

    // Read sensors
    int soilMoisture = analogRead(SOIL_MOISTURE_PIN);
    int mq2Value = analogRead(MQ2_PIN);
    int lightLevel = analogRead(LDR_PIN);
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();

    if (isnan(temperature) || isnan(humidity)) {
        Serial.println("Failed to read from DHT sensor!");
    } else {
      Serial.printf("Soil: %d | MQ2: %d | Light: %d | Temp: %.2f | Hum: %.2f | Pump: %s | Fan: %s | LED: %s\n", 
                  soilMoisture, mq2Value, lightLevel, temperature, humidity,
                  pumpState ? "ON" : "OFF", fanState ? "ON" : "OFF", growLedState ? "ON" : "OFF");
    }


    if (wifiConnected) {
        // Fetch remote settings periodically
        if (millis() - lastControlsFetch > 15000) { // Every 15 seconds
            fetchControlStates();
            lastControlsFetch = millis();
        }
        if (millis() - lastThresholdFetch > 600000) { // Every 10 minutes
            fetchThresholds();
            lastThresholdFetch = millis();
        }

        // Control actuators based on sensor data AND remote settings
        handleActuators(soilMoisture, mq2Value, lightLevel, temperature);

        // Send data to backend periodically
        if (millis() - lastSensorSend > 10000) { // Every 10 seconds
            sendSensorData(temperature, humidity, soilMoisture, mq2Value, lightLevel);
            lastSensorSend = millis();
        }

        if (millis() - lastImageSend > 3600000) { // Every hour
            sendImageForDiagnosis();
            lastImageSend = millis();
        }
    }

    delay(2000);
}
