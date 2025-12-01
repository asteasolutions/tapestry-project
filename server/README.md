# Tapestry Server

This project hosts the backend implementation of the main Tapestry application. It consist of two main parts - a Node.js server implementing the REST API described in [`shared`](../shared/) and a background worker that executes asynchronous jobs.

## Setup

### Infrastructure

This server requires the following infrastructure components:
 - A PostgreSQL database for storing Tapestry data.
 - An AWS S3 bucket for storing Tapestry binary assets.
 - A Redis server instance for caching and scheduling background jobs.
 - (optional) A HashiCorp Vault for storing user secrets such as AI API keys.

These services can be configured manually, started via docker-compose, or orchestrated using the included [OpenTofu configuration](../open-tofu/).

### Environment Variables

Take a look at [`.env.example`](./.env.example) or [`config.ts`](./src/config.ts) for a list of configuration variables. To configure the server for local execution, copy `.env.example` to `.env`, and fill in the blanks.

### Prisma Types and Migrations

This project uses [Prisma ORM](https://www.prisma.io/) which generates database-related types dynamically. In order for the application to compile correctly, the Prisma types must first be generated from the `schema.prisma` file. This can be done by running:

```sh
npm run prisma:generate
```

Additionally, in order to set up the database, the DB migrations also need to be applied:

```sh
npm run prisma:migrate
```

Note that these two commands must also be run every time there is a change in the `schema.prisma` file.

### Running Locally

To run the server locally, all necessary infrastructure needs to be available, configuration must be provided in a `.env` file, the Prisma types must be generated, and DB migrations executed. The server can then be started by running:

```sh
npm start
```

And the background worker can be started using:

```sh
npm run start:worker
```

### Docker

The Tapestry Project also includes Dockerfiles for some components. They are used internally when running the project using `docker compose` or OpenTofu. However, [`Dockerfile.server`](../Dockerfile.server) is a good place to see all external dependencies the `server` project has. Note for example, that the `worker` part of the Docker image requires `chromium` (used by `puppeteer` for making screenshots when generating item or tapestry thumbnails), `ffmpeg` and `imagemagick` (again, for generating item thumbnails for videos, PDFs, etc.).

## Project Structure

As mentioned above, the project contains two main parts - REST API and background tasks.

### REST API

The `src/resources` directory contains implementations of all REST resources described in the `shared` project. The main request handling flow is described in [`resources/base-resource.ts`](./src/resources/base-resource.ts). It includes parsing the request parameters, invoking the appropriate access control handlers, executing the main endpoint logic, serializing the result, and sending it back to the client. The specific access policies along with implementation of resource endpoints are provided in separate files, one per REST resource.

### Background Tasks

The application uses [BullMQ](https://bullmq.io/) for executing background jobs. The entrypoint for background workers is [`tasks/worker.ts`](./src/tasks/worker.ts). All of the supported tasks that background workers can execute are also implemented in the [`tasks/`](./src/tasks/) directory. Currently these include generating item or tapestry thumbnails, as well as importing or forking tapestries.
