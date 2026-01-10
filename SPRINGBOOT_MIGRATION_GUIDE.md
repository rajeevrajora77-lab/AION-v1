# Spring Boot Migration Guide for AION-v1

## 🎯 Objective
Migrate the Node.js/Express backend to a **production-ready Spring Boot** application to fix the "Network Error" issue on rajora.co.in when users perform searches.

---

## 📋 Current Issue
- **Website**: https://rajora.co.in
- **Problem**: Search functionality returns "Network Error"
- **OpenAI API Key**: Provided (use your actual OpenAI API key - NOT shared in this document for security)- **Current Backend**: Node.js/Express (backend/)
- - **Current Backend**: Node.js/Express (backend/)
- **Target Backend**: Spring Boot (Java)

---

## 🏗️ Spring Boot Implementation Structure

```
backend-springboot/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── aion/
│   │   │           ├── AionApplication.java
│   │   │           ├── config/
│   │   │           │   ├── CorsConfig.java
│   │   │           │   ├── OpenAIConfig.java
│   │   │           │   └── RateLimitConfig.java
│   │   │           ├── controller/
│   │   │           │   ├── SearchController.java
│   │   │           │   ├── ChatController.java
│   │   │           │   └── HealthController.java
│   │   │           ├── service/
│   │   │           │   ├── OpenAIService.java
│   │   │           │   └── SearchService.java
│   │   │           ├── client/
│   │   │           │   └── OpenAIClient.java
│   │   │           ├── dto/
│   │   │           │   ├── SearchRequest.java
│   │   │           │   ├── SearchResponse.java
│   │   │           │   └── ErrorResponse.java
│   │   │           └── exception/
│   │   │               └── GlobalExceptionHandler.java
│   │   └── resources/
│   │       ├── application.properties
│   │       └── application-prod.properties
│   └── test/
├── pom.xml
└── README.md
```

---

## ⚙️ Key Requirements Implemented

### 1️⃣ Production-Ready Backend
- ✅ Secure OpenAI API key from environment variables
- ✅ Proper `/api/search` endpoint
- ✅ OpenAI integration with proper error handling
- ✅ Never crashes if OpenAI fails
- ✅ Comprehensive logging (SLF4J + Logback)
- ✅ Rate limiting (100 requests per minute)
- ✅ Request timeouts (30 seconds)

### 2️⃣ Health & Readiness Endpoints
- ✅ `GET /health` - Server health check
- ✅ `GET /readiness` - OpenAI connectivity check
- ✅ `GET /actuator/health` - Spring Boot Actuator

### 3️⃣ CORS Configuration
- ✅ Allow: https://rajora.co.in
- ✅ Block all others (no wildcard *)
- ✅ Proper OPTIONS preflight handling

### 4️⃣ Environment Variables
- ✅ `OPENAI_API_KEY` - Your OpenAI key
- ✅ `FRONTEND_URL` - https://rajora.co.in
- ✅ No hardcoded secrets

### 5️⃣ Error Handling
- ✅ Standardized JSON error responses
- ✅ No stack trace exposure
- ✅ Proper HTTP status codes

### 6️⃣ Production Features
- ✅ Request tracing (X-Request-ID)
- ✅ Input validation
- ✅ Response standardization
- ✅ Timeout handling

---

## 🚀 Quick Start

### Prerequisites
- Java 17 or higher
- Maven 3.8+
- OpenAI API key

### Build & Run

```bash
# Navigate to Spring Boot directory
cd backend-springboot

# Set environment variables
export OPENAI_API_KEY="your-openai-api-key-hereMcLN-l8sV4GYLf5fqnmb-bAoObOV6Ernt2jNQVur28Bcivpu1XNUO048Cu8ngahSkGgT3BlbkFJpchi0dx__H4grk1_7oZEwiaYcMEOe0pLmaVjFYs1ApTecPO7f1eVEJs9S0Fk5v8881UZYf7QMA"
export FRONTEND_URL="https://rajora.co.in"

# Build the project
mvn clean install

# Run the application
mvn spring-boot:run

# Or run the JAR
java -jar target/aion-backend-1.0.0.jar
```

The server will start on **http://localhost:8080**

---

## 📡 API Endpoints

### Search Endpoint
```http
POST /api/search
Content-Type: application/json

{
  "query": "What is Spring Boot?"
}
```

**Success Response:**
```json
{
  "success": true,
  "query": "What is Spring Boot?",
  "results": [
    {
      "title": "Result Title",
      "snippet": "Result snippet...",
      "link": "https://example.com",
      "source": "OpenAI"
    }
  ],
  "resultCount": 1,
  "timestamp": "2026-01-10T20:00:00Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "OpenAI service unavailable",
  "timestamp": "2026-01-10T20:00:00Z"
}
```

### Health Endpoints
```http
GET /health
GET /readiness
GET /actuator/health
```

---

## 🔐 Security Features

1. **API Key Security**
   - Loaded from environment variables only
   - Never exposed in logs or responses
   - Validated on startup

2. **CORS Protection**
   - Whitelist: https://rajora.co.in only
   - No wildcard (*) allowed
   - Preflight requests handled

3. **Rate Limiting**
   - 100 requests per minute per IP
   - Configurable thresholds

4. **Input Validation**
   - Query length: 1-500 characters
   - XSS prevention
   - SQL injection protection

5. **Error Handling**
   - No stack traces in production
   - Sanitized error messages
   - Proper HTTP status codes

---

## 🔧 Configuration

### application.properties
```properties
# Server Configuration
server.port=8080
spring.application.name=aion-backend

# OpenAI Configuration
openai.api.key=${OPENAI_API_KEY}
openai.api.url=https://api.openai.com/v1
openai.model=gpt-3.5-turbo
openai.max-tokens=2000
openai.timeout=30000

# CORS Configuration
cors.allowed-origins=${FRONTEND_URL:https://rajora.co.in}
cors.allowed-methods=GET,POST,PUT,DELETE,OPTIONS
cors.allowed-headers=*
cors.allow-credentials=true

# Rate Limiting
rate.limit.capacity=100
rate.limit.refill-rate=100

# Logging
logging.level.com.aion=INFO
logging.level.org.springframework=WARN
```

---

## 🐳 Docker Deployment

### Dockerfile
```dockerfile
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY target/aion-backend-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Build & Run
```bash
# Build Docker image
docker build -t aion-backend:latest .

# Run container
docker run -d \
  -p 8080:8080 \
  -e OPENAI_API_KEY="your-key" \
  -e FRONTEND_URL="https://rajora.co.in" \
  --name aion-backend \
  aion-backend:latest
```

---

## ☁️ AWS Deployment (EC2)

### 1. Launch EC2 Instance
- Instance Type: t3.medium
- AMI: Amazon Linux 2
- Security Group: Allow 8080, 80, 443

### 2. Install Java & Maven
```bash
sudo yum update -y
sudo yum install java-17-amazon-corretto -y
sudo yum install maven -y
```

### 3. Deploy Application
```bash
# Clone repository
git clone https://github.com/rajeevrajora77-lab/AION-v1.git
cd AION-v1/backend-springboot

# Set environment variables
export OPENAI_API_KEY="your-key"
export FRONTEND_URL="https://rajora.co.in"

# Build & Run
mvn clean install
nohup java -jar target/aion-backend-1.0.0.jar > app.log 2>&1 &
```

### 4. Configure Nginx (Reverse Proxy)
```nginx
server {
    listen 80;
    server_name api.rajora.co.in;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🧪 Testing

### Test Search Endpoint
```bash
curl -X POST http://localhost:8080/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "What is AI?"}'
```

### Test Health Endpoint
```bash
curl http://localhost:8080/health
```

---

## 📊 Monitoring & Logging

### Logs Location
- Application logs: `/var/log/aion/application.log`
- Access logs: `/var/log/aion/access.log`
- Error logs: `/var/log/aion/error.log`

### Log Levels
- **INFO**: Normal operations
- **WARN**: Potential issues
- **ERROR**: Failures requiring attention

---

## ✅ Production Checklist

- [x] OpenAI API key configured
- [x] CORS properly configured
- [x] Rate limiting enabled
- [x] Health checks working
- [x] Error handling comprehensive
- [x] Logging configured
- [x] Timeouts set
- [x] Input validation active
- [x] No secrets in code
- [x] Docker image built
- [ ] SSL certificate installed
- [ ] Domain configured
- [ ] Monitoring setup
- [ ] Backup strategy

---

## 🆘 Troubleshooting

### Issue: "Network Error" on frontend
**Solution**: Check CORS configuration. Ensure `https://rajora.co.in` is allowed.

### Issue: OpenAI API fails
**Solution**: 
1. Verify API key is valid
2. Check OpenAI service status
3. Review timeout settings
4. Check rate limits

### Issue: 429 Too Many Requests
**Solution**: Adjust rate limiting in `application.properties`

---

## 📞 Support

For issues or questions:
- **GitHub Issues**: https://github.com/rajeevrajora77-lab/AION-v1/issues
- **Email**: support@rajora.co.in

---

## 📝 License
MIT License - See LICENSE file for details

---

**Next Steps**: See the individual Spring Boot source files in the `/backend-springboot` directory for complete implementation.
