# Tapestry Project

A *Tapestry* is a digital format describing an endless canvas that hosts a variety of interconnected multimedia items. An instance of the Tapestry Project is hosted on https://tapestries.media. The Tapestry Project is open-source.

## Repository Structure

 * [`core`](./core) - Contains a description of the base Tapestry data format, including TypeScript types, Zod schemas, and various utilities.
 * [`core-client`](./core-client) - An opinionated collection of React tools and components for building React-based Tapestry applications.
 * Main application consisting of three separate sub-projects:
   * [`shared`](./shared) - Builds on top of the `core` schemas to describe one specific REST API structure along with Data-Transfer Object (DTO) definitions. Describes the "contract" for client-server communication.
   * [`server`](./server) - The backend component of the main application. Handles authentication, data validation, persists tapestry data in a database, auto-generates item thumbnails during Tapestry creation, etc.
   * [`client`](./client) - The main frontend application, including a Tapestry viewer and a WYSIWYG Tapestry authoring tool.

## Running the Tapestry Application

As mentioned above, the main Tapestry application is a web application, consisting of a frontend React app (implemented in the `client` sub-project) and a backend Node.js/Express app (implemented in the `server` sub-project). An instance of this application runs on https://tapestries.media. Below is a short guide on how to run it locally after cloning this repository. Some hints regarding custom deployments are also included.

### Configuration

The application is configured via environment variables. The env variables for the frontend configuration need to be provided during build time and the env variables for the backend configuration need to be provided during runtime. In both cases this can be achieved using `.env` files which are convenient for local development but may not be appropriate for deployment scenarios. For local development, a good starting point for building `.env` files are the `.env.example` files provided in the `server` and `client` directories. For a full list of configuration variables, take a look at [`server/src/config.ts`](/server/src/config.ts) and [`client/src/config.ts`](/client/src/config.ts).

#### Authentication Providers

The application doesn't have built-in user registration and authentication capabilities and depends on external authentication providers. Currently there are two supported providers: Internet Archive and Google. The application can use either one or the other. This is configured via the `VITE_AUTH_PROVIDER` variable in the `client` project.

##### Internet Archive Login

If `VITE_AUTH_PROVIDER` is set to `ia`, the Tapestries frontend will provide a username/password form for users to log in. In this form users can enter any valid credentials for [Internet Archive](https://archive.org). No further configuration is necessary for this to work.

It is also possible to configure the Tapestry application to use shared sessions with `archive.org`, i.e. users who have already logged into `archive.org` get logged into Tapestries automatically. For this purpose, the Tapestry application needs to be deployed to a subdomain of `archive.org` and the `IA_ACCOUNT_ID` and `IA_SECRET` env variables for the server need to be configured with an account that has permissions to use the IA xauthn API.

##### Google Login

If `VITE_AUTH_PROVIDER` is set to `google`, the Tapestries frontend will display a "Sign in With Google" button. The application uses Google Identity Services for this workflow and needs a valid OAuth2.0 client ID to be provided via the `GOOGLE_CLIENT_ID` env variable for the backend and `VITE_GOOGLE_CLIENT_ID` for the frontend. Follow this guide to obtain a Google Client ID: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid#get_your_google_api_client_id

## Running Locally

The main Tapestry application consists of a backend (`server` API and worker) and frontend (`client`) components, but it also requires additional infrastructure. More specifically:
 - A PostgreSQL database for storing Tapestry data.
 - An AWS S3 bucket for storing Tapestry binary assets.
 - A Redis server instance for caching and scheduling background jobs.
 - (optional) A HashiCorp Vault for storing user secrets such as AI API keys.

This makes a total of 7 separate components. Each of these components can be hosted in multiple ways - locally on the host machine, in a Docker container, as an external service (SaaS), etc. Obviously this creates a very large amount of possible setups for local development or deployment. Here we will discuss each of these components shortly and show an example how it can be started locally, but keep in mind that in some cases there may be more convenient ways to run it.

### TL;DR

If you want to skip the discussions below and just run everything locally, here is a short list of commands to do it. It assumes `server/.env` and `client/.env` exist and are properly configured. Also, when starting the database container for the first time, the env variables `DB_NAME`, `DB_USER`, and `DB_PASS` need to exist in the shell environment and they need to match the ones defined in `server/.env`.

```sh
npm install
npm run db:start
npm run localstack:start
npm run redis:start
cd server
# If running for the first time or if schema.prisma has been modified
# ---
npm run prisma:generate
npm run prisma:migrate
# ---
npm start

# In a new terminal
cd server
npm run start:worker:dev

# In a new terminal
cd client
npm start
```

### PostgreSQL Database

The application is mostly tested with PostgreSQL 17. It may also work with other versions, but without any guarantees. Whatever Postgre server is used (local, SaaS, or Docker-based), it needs to have a database and a user that match the `DB_NAME`, `DB_USER`, and `DB_PASS` env variables. When starting a fresh Postgre instance from a Docker image, Postgre will automatically create the database and the user if you pass them as parameters. The simplest way to run this is:

```sh
npm run db:start
```

### AWS S3

AWS S3 is used for asset storage. If you already have an AWS account, the simplest option would be to create an S3 bucket and configure the `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, and `AWS_S3_BUCKET_NAME` env variables appropriately when running the server and worker apps.

A simpler option for local development is to use LocalStack. LocalStack is an AWS-compatible cloud emulator which can be run locally from a Docker image. This option is also available as an NPM script in the root `project.json`:

```sh
npm run localstack:start
```

**NB: The free version of LocalStack doesn't support persistence, so restarting this Docker container will wipe all Tapestry assets!**

Another alternative is to use [Minio](https://www.min.io/), or any other S3-compatible service.

Sometimes you might need to change the way the aws presigned URLs are generated. By default virtual-hosted style is used (i.e. the bucket name is used as a subdomain - `https://<bucket-name>.s3.<region>.amazonaws.com`). By setting `AWS_S3_FORCE_PATH_STYLE` to `true` you can change this to path style - `https://s3.<region>.amazonaws.com/<bucket-name>/`.

When using anything other than the default AWS S3, you also need to configure the env variable `AWS_ENDPOINT_URL`. For example, for LocalStack it could look something like this:

```
AWS_ENDPOINT_URL=http://s3.localhost.localstack.cloud:4566
```

### Redis

Tapestries uses Redis 7 for caching and background job scheduling (via BullMQ). The options for hosting it are similar to the ones for Postgres - either locally, from a Docker image, or as SaaS. There is an NPM script for running it as a Docker image:

```sh
npm run redis:start
```

### HashiCorp Vault

This component is optional. Currently it is only used for storing user-provided API keys for LLM providers such as Gemini. If a vault is not configured, users would not be able to provide such API keys, and the AI Chat functionality will not work, but everything else in Tapestries will work normally.

The options for running a Vault are similar as above, and again, there is an NPM script for running it from a Docker image:

```sh
npm run vault:start
```

### API Server

The Tapestry API Server can also be run as a Docker image. It is described in [`Dockerfile.server`](./Dockerfile.server) and used in the docker-compose files. However, for local development it is often more convenient to run it directly on the host machine. To do this, you will need at least Node v22. (A convenient way to manage Node versions is by using [nvm](https://github.com/nvm-sh/nvm).)

First, install all required Node packages by running `npm install` in the root project. Note that this will also install the packages required by the `client` and the other projects since they are all configured as NPM workspaces.

Then, switch to the `server` directory to generate the database-related types and run the migrations:

```sh
cd server
npm run prisma:generate
npm run prisma:migrate
```

Finally, still in the `server` directory, start the API server:

```sh
npm start
```

### Background Worker

The setup for the background worker is identical to the one for the API server since they basically run the same codebase, but with different entrypoints. Assuming the commands for the server above have already been executed, you can simply start the worker in a separate terminal:

```sh
cd server
npm run start:worker:dev
```

Note that the worker requires some additional packages to be installed on the host machine, such as `chromium`, `ffmpeg`, and `imagemagick`. They are all described in the `worker` section of `Dockerfile.server`.

### Client

For deployment scenarios, the client would typically be built using `npm run build` or via Docker using [`Dockerfile.client`](/Dockerfile.client). The resulting bundle (the contents of `client/dist/` for local builds) would then be deployed to an appropriate static resource server or pushed to an S3 bucked and served via CloudFront.

However, for local development, one can simply use the Vite dev server by running:

```sh
cd client
npm start
```
