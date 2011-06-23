
#include <SPI.h>
#include <Ethernet.h>
#include <math.h>

byte mac[]     = {  0xDE, 0xAD, 0xBE, 0xEF, 0xDE, 0xAD };
byte ip[]      = { 192, 168,   1,  45 };
byte gateway[] = { 192, 168,   1,   1 };
byte subnet[]  = { 255, 255, 255,   0 };
byte server[]  = { 192, 168, 1,  10 };

int ledPin  =  13; // LED connected to digital pin 13
int tempPin = 5;   // thermister read pin

// set up the client request
Client client(server, 8080);

// returns the celsius value from the resistence reading
// math is neat
double convertToCelsius(int RawADC) {
 double temp;
 temp = log(((10240000/RawADC) - 10000));
 temp = 1 / (0.001129148 + (0.000234125 * temp) + (0.0000000876741 * temp * temp * temp));
 temp = temp - 273.15;

 return temp;
}


void setup() {
  Ethernet.begin(mac, ip, gateway, subnet);
  delay(1000);

  Serial.begin(115200);
  Serial.println("Startup");

  pinMode(ledPin, OUTPUT);
}

void loop()
{
  // start of the run, to keep near 5 seconds
  unsigned long start  = millis();
  static int pinStatus = 0;

  double temp = convertToCelsius(analogRead(tempPin));

  if (client.connect()) {
    Serial.println("connected");

    // make request
    client.print("GET /post?key=YOURKEY&temperature=");
    client.println(temp);
    client.println();

    // ignore any response, disconnect
    client.stop();
  } else {
    // connection failure
    Serial.println("error: connection failed");
  }
  
  Serial.print("temperature: "); // output temperature to serial port
  Serial.println(temp);

  digitalWrite(ledPin, (++pinStatus % 2) ? HIGH : LOW);
  delay(5000 - (millis() - start));
}
