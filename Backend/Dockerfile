# Start with a lightweight Python image
FROM python:3.12-slim

# Set a working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt ./

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire application code into the container
COPY . .

# Expose the port that the Flask app will run on
EXPOSE 5000

# Set environment variables (optional)
ENV dbusername=UsernameHere
ENV dbpassword=PasswordHere

# Run the Flask server for dev
CMD ["flask", "--app", "main.py","run", "--host=0.0.0.0"] 

# Run the Flask server for prod
# CMD ["gunicorn", "--bind", "0.0.0.0:5000", "main:app"] 
