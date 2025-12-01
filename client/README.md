# Tapestry Client

This project implements the frontend of the main Tapestry application. It is a React-based application, built on top of the abstractions defined in the [`core-client`](../core-client/) project. This project extends the Tapestry visualization capabilities supported by `core-client` and implements a WYSIWYG Tapestry editor.

## Setup

### Environment Variables

Take a look at [`.env.example`](./.env.example) or [`config.ts`](./src/config.ts) for a list of configuration variables. To configure the client for local execution, copy `.env.example` to `.env`, and fill in the blanks.

### Running Locally

To start the client locally just run:

```sh
npm start
```

## Project Structure

### REST API Client

Communicating with the REST API exposed by the Tapestry backend is implemented via the generic `resource` function defined in [`services/rest-resources`](./src/services/rest-resources.ts). It doesn't have any resource-specific extensions, because the REST resource descriptors defined in the [`shared`](../shared/) project are a sufficient basis for implementing the resource accessors in an entirely generic manner. Here is an example invocation that illustrates how this function can be used:

```ts
await resource('tapestries').list({
  filter: { 'title:icontains': 'sometext' },
  orderBy: '-createdAt',
  include: ['owner'],
  skip: 0,
  limit: 10,
})
```

### React App

This React Application contains multiple pages, but by far the most complicated one is the Tapestry viewer/editor. Most of the components and logic defined in this project are related to the viewer/editor, but there are also some specific components related to other pages such as the Dashboard or the User Profile page.

The Tapestry viewer/editor's structure follows the guidelines described in [`core-client`](../core-client/). It implements a custom `Store` with a view model which is an extension of the base `TapestryViewModel`. It also uses some custom Controllers and Pixi renderers, but overall everything is coordinated according to the concepts developed in `core-client`.
