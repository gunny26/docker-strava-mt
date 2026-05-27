# Use an ARM-compatible slim Python image
FROM python:3.11-slim-bookworm

# Set working directory
WORKDIR /app

# Füge Build-Argument für Git-Commit-Hash hinzu
ARG GIT_COMMIT_HASH
ENV GIT_COMMIT_HASH=$GIT_COMMIT_HASH

# Install dependencies with ARM-compatible wheels
# We will need fastapi and uvicorn for the web server
RUN pip install --no-cache-dir --only-binary=:all: fastapi uvicorn gpxpy requests

# Copy the application code
COPY . .

# Expose the port
EXPOSE 8000

# Start the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
