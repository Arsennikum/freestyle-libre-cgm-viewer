plugins {
    kotlin("js") version "1.9.0"
}

repositories {
    mavenCentral()
}

kotlin {
    js(IR) {
        binaries.executable()
        browser {
        }
    }
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-html-js:0.9.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
}
