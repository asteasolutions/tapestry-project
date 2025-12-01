# Tapestry Shared

This project contains types and utilities that are shared between the `client` and `server` implementations of the main Tapestry application. It also defines the contract for communication between the client and the server, i.e. the REST API endpoints.

## Data Transfer Objects

The object structures that are used to transfer data between the server and the client are defined in [`data-transfer/resources`](./src/data-transfer/resources/). Each REST resource has a corresponding DTO definition (TypeScript interface) and a Zod schema that validates it. (TS interfaces are intentionally separated from Zod schemas in order to reduce the load on the TS compiler. This may no longer be necessary with Zod v4 which includes significant type optimizations, so types can be inferred from Zod schemas at a lower performance cost, but we have decided to keep them separate for now, nevertheless.)

## REST API

Communication between the server and the client is based on a RESTful API, consisting of a set of REST resources with standard CRUDL (create, read, update, destroy, list) operations. Here is a list of the main features the REST API supports:
 - *Consistent resource structures.* Resources have the same structure, no matter from which endpoint they were loaded.
 - *Consistent methods.* Each REST resource supports a subset of the CRUDL operations.
 - *Optional authentication.* Some of the supported methods for each resource can optionally be accessible only to authenticated users.
 - *Include related documents.* API clients can optionally ask the server to include related documents when requesting a resource. For example a request to `GET /api/tapestries/:id?include=owner` would instruct the server to fetch the requested Tapestry, but also include the public profile of its owner when returning the response. The list of allowed includes for each resource is explicitly provided in the resource's configuration.
 - *Consistent filtering options.* Whenever an endpoint supports filtering, it is always structured using query parameters of the following type: `?filter[field:op]=value`. For example `GET /api/tapestries?filter[title:icontains]=sometext&filter[visibility:eq]=public`. The supported filtering options for each endpoint are not explicitly listed in its configuration but are determined by the specific implementation.
 - *Separate schemas for create and update parameters.* When creating or updating resources, the payload that the client sends to the server may differ from the canonical resource representation. The custom create/update param schemas are described in the resource configuration.

All resource configurations are listed in [`data-transfer/resources/index.ts`](./src/data-transfer/resources/index.ts). Based on the descriptors defined in this file, the `server` project provides the corresponding endpoint implementations and the `client` project implements resource access APIs. Note that some additional features of the REST API, such as fine-grained access control, are implemented in the `server` project and are not described here.

## WebRTC and WebSockets

In addition to the REST API, the Tapestry client and server use WebSockets and WebRTC for communication in some specific use cases. Currently these communication protocols are used only in the Tapestry editor to publish Tapestry changes and to share collaborator cursor locations respectively. The TS types related to RTC and sockets are described in `data-transfer/rtc-signaling` and `data-transfer/socket` respectively.
