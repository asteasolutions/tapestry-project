# Tapestry Core

This project contains a description of the core Tapestry format along with some utilities that may be useful when parsing or visualizing it. The format is described using [Zod](https://zod.dev/) schemas and TypeScript interfaces.

## Tapestry Format

A Tapestry can be distributed as a ZIP file, containing a top-level descriptor, `root.json`, along with any binary files that may be part of the Tapestry. The `root.json` file contains a single JSON object conforming to [`CurrentExportSchema`](./src/data-format/export/index.ts) (which is basically a [`TapestrySchema`](./src/data-format/schemas/tapestry.ts) with a few additional fields). Binary files included in the Tapestry ZIP can be referenced from `root.json` using a `file:/` prefix, followed by a relative path.

In some applications, Tapestries may not be stored as a single ZIP file, but as a collection of objects and resources in multiple storage locations. In such cases the Tapestry schemas can be used as a foundation for building database table structures.

## Versioning

The Tapestry format has evolved in time and is continuing to evolve. The structures used to define its latest version are described in [data-format/schemas](./src/data-format/schemas/) and the historical evolution of the Tapestry ZIP format is described in [data-format/export](./src/data-format/export/). The latter directory also contains parsers that can be used to parse a Tapestry ZIP constructed with any of the previous versions of the format.
