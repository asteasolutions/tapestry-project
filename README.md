# Tapestry Project

A *Tapestry* is a digital format describing an endless canvas that hosts a variety of interconnected multimedia items. An instance of the Tapestry Project is hosted on https://tapestries.media. The Tapestry Project is open-source.

## Repository structure

 * [`core`](./core) - Contains a description of the base Tapestry data format, including TypeScript types, Zod schemas, and various utilities.
 * [`core-client`](./core-client) - An opinionated collection of React tools and components for building React-based Tapestry applications.
 * Main application consisting of three separate sub-projects:
   * [`shared`](./shared) - Builds on top of the `core` schemas to describe one specific REST API structure along with Data-Transfer Object (DTO) definitions. Describes the "contract" for client-server communication.
   * [`server`](./server) - The backend component of the main application. Handles authentication, data validation, persists tapestry data in a database, auto-generates item thumbnails during Tapestry creation, etc.
   * [`client`](./client) - The main frontend application, including a Tapestry viewer and a WYSIWYG Tapestry authoring tool.
