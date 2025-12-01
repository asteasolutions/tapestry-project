# Tapestry Core Client

This project is a library of frontend components and tools for building React-based Tapestry applications. It defines several opinionated concepts on top of which Tapestry applications are built.

## Store

Since a typical Tapestry application contains many React components that are logically interconnected (as being parts of the same Tapestry), it may become difficult to maintain shared "view" state between them. This is problem is mitigated by using a central state storage - the Store. This concept is familiar in the Rect world from other state sharing libraries such as Redux. The Store we have built for Tapestries is conceptually similar to Redux, but much simpler in some aspects. It is simply a centralized, strongly typed, observable state storage mechanism.

The Store maintains a single immutable top-level object - the "view model". The view model may have arbitrary structure, but it must be described in advance via a TypeScript interface. Components or other modules can subscribe for changes in specific parts of the view model by using one of the `store.subscribe()` method overloads, or get parts of the data directly, using `store.get()`. Data in the store can be modified via `store.dispatch(command)` where `command` is a `StoreMutationCommand` - a simple function that takes a mutable proxy of the view model and mutates it.

As mentioned, the view model inside the store is immutable - if a component obtains (parts of) it, it will never change internally. `StoreMutationCommand`s essentially create clones of the modified portions of the store and replace it in the Store's main view-model reference. This behavior is backed by [Immer.js](https://immerjs.github.io/immer/).

The Store is a generic component and can be used outside the context of a Tapestry.

## Stage

The "stage" of a Tapestry is the logical set of all elements that participate in the visualization and interactivity of the Tapestry's canvas. It typically consists of two visual layers:
 - An HTML Canvas element for drawing custom shapes such as arrows. Drawing is performed using [Pixi.js](https://pixijs.com/), so this canvas is often called "the Pixi canvas".
 - A DOM root element. This is the container of all React components that are used to represent items on the Tapestry. It is superimposed on top of the Pixi canvas.

### Renderers

Renderers are classes that encapsulate some drawing logic for visualizing specific visual objects on the Pixi canvas. There is one root renderer - the `TapestryRenderer` that coordinates all the others. There is also, for example, one renderer for each "rel" (i.e. arrow) in the Tapestry. Additional renderers can be implemented for drawing other custom shapes that, for some reason, are not suitable for visualization in the DOM.

### Controllers

Controllers are classes that handle Tapestry-level user interactions. User interactions that can unambiguously be handled in the sandbox of a specific React component, don't need to be handled by controllers. However, in some cases the same gesture, e.g. a click or a scroll, may be interpreted differently depending on the current state of the Tapestry. Such events are disambiguated in Controllers.

### Gesture Detector

To help detect zooming and panning gestures, the Controllers have at their disposal a shared reference to a custom GestureDetector instance that encapsulates this logic and fires higher-level "zoom" and "pan" events.

### React Components

A number of reusable and Tapestry-specific React components have been implemented to help visualize various aspects of the Tapestry. The main Tapestry canvas can be visualized using the `TapestryCanvas` component. It allows for some customization by exposing a set of React components that can be overridden in the configuration. The `TapestryCanvas` must be rendered inside a `TapestryConfigContext` that provides hooks for connecting to the Store, as well as other configuration options.

