# Frosted Fabrics

Frosted Fabrics is a full-stack web application built with a Next.js frontend, Flask backend, and MySQL database.

## Project Structure

The project is organized into three main components:

- `Frontend/`: Contains the Next.js frontend application
- `Backend/`: Contains the Flask backend application
- `docker-compose.yml`: Defines the multi-container Docker application

## Prerequisites

Before you begin, ensure you have the following installed and running on your system:

- Docker
- Docker Compose

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/Diechewood/Group7-4375
   cd frosted-fabrics
   ```

2. Create a `.env` file in the `Backend/` directory with any necessary environment variables for your Flask application.

## Running the Application

To start the application, run the following command from the root directory:

```
docker-compose up --build
```

This command will build the Docker images (if they haven't been built before) and start the containers. The `--build` flag ensures that the images are rebuilt if there have been any changes to the Dockerfiles or source code.

Once the containers are running, you can access:

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Services

The application consists of three services:

1. **Frontend**: A Next.js application running in development mode.
   - Port: 3000
   - Environment: Development
   - Volume: The `Frontend` directory is mounted to allow for hot-reloading during development.

2. **Backend**: A Flask application.
   - Port: 5000
   - Environment: Development
   - Environment File: `./Backend/.env`
   - Volume: The `Backend` directory is mounted to allow for hot-reloading during development.

3. **Database**: A MySQL 8.0 database.
   - Environment variables for database configuration are loaded from the root `.env` file.
   - Data is persisted using a named volume (`mysql_data`).

## Development Workflow

The Docker setup is configured for a development environment:

- The frontend and backend containers have their respective directories mounted as volumes, allowing for real-time code changes without rebuilding the containers.
- The frontend is running in development mode with hot-reloading enabled.
- The backend is running with Flask's development server.

To apply changes:

- Frontend: Save your changes in the `Frontend/` directory. Next.js will automatically reload with the new changes.
- Backend: Save your changes in the `Backend/` directory. You may need to restart the Flask development server (you can do this by restarting the backend container: `docker-compose restart backend`).

## Stopping the Application

To stop the application, use the following command:

```
docker-compose down
```

This will stop and remove the containers. The database data will be preserved in the `mysql_data` volume.

## Additional Commands

- To view logs: `docker-compose logs -f`
- To rebuild a specific service: `docker-compose build <service_name>`
- To restart a specific service: `docker-compose restart <service_name>`

Replace `<service_name>` with `frontend`, `backend`, or `db` as needed.

## Troubleshooting

If you encounter any issues:

1. Ensure all required environment variables are set correctly in the `.env` files.
2. Check the Docker logs for any error messages.
3. Try rebuilding the images with `docker-compose build --no-cache`.
4. If changes are not reflecting, ensure the correct directories are mounted as volumes in the `docker-compose.yml` file.

For more detailed information about each component, refer to the README files in the `Frontend/` and `Backend/` directories.