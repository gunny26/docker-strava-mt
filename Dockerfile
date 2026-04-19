# Use a slim Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies
# We will need fastapi and uvicorn for the web server
RUN pip install --no-cache-dir fastapi uvicorn gpxpy requests

# Copy the application code
COPY . .

# Expose the port
EXPOSE 8000

# Start the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
