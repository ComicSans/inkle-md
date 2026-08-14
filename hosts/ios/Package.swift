// swift-tools-version: 5.9
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

import PackageDescription

// No dependencies here either, for the same reason the rest of the project has
// none: JavaScriptCore is a system framework on every platform listed below.
let package = Package(
    name: "StoryWeaver",
    platforms: [.iOS(.v16), .macOS(.v13)],
    products: [
        .library(name: "StoryWeaver", targets: ["StoryWeaver"]),
    ],
    targets: [
        .target(name: "StoryWeaver"),
        .testTarget(name: "StoryWeaverTests", dependencies: ["StoryWeaver"]),
    ]
)
