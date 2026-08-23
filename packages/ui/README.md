# @nordprint/ui

Shared React primitives for the NordPrint storefront.

This package ships **TypeScript source**, not a build. The storefront compiles
it through Next.js `transpilePackages`, which is deliberate: `tsc` emits a
`"use strict"` prologue ahead of `"use client"`, and Next only recognises the
client directive when it is the first statement in the module. Compiling from
source keeps client components working and gives instant HMR during
development.

The backend never imports this package, so nothing else needs a build artefact.
