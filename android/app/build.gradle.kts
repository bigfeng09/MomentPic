plugins {
    id("com.android.application")
}

val releaseStorePath = providers.environmentVariable("MOMENTPIC_ANDROID_KEYSTORE").orNull
val releaseStorePassword = providers.environmentVariable("MOMENTPIC_ANDROID_STORE_PASSWORD").orNull
val releaseKeyAlias = providers.environmentVariable("MOMENTPIC_ANDROID_KEY_ALIAS").orNull
val releaseKeyPassword = providers.environmentVariable("MOMENTPIC_ANDROID_KEY_PASSWORD").orNull

android {
    namespace = "top.five915.momentpic"
    compileSdk = 36

    defaultConfig {
        applicationId = "top.five915.momentpic"
        minSdk = 23
        targetSdk = 36
        versionCode = 3
        versionName = "1.2.0-beta1"
    }

    signingConfigs {
        if (!releaseStorePath.isNullOrBlank()
            && !releaseStorePassword.isNullOrBlank()
            && !releaseKeyAlias.isNullOrBlank()
            && !releaseKeyPassword.isNullOrBlank()) {
            create("release") {
                storeFile = file(releaseStorePath)
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        getByName("release") {
            signingConfigs.findByName("release")?.let { signingConfig = it }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.activity:activity:1.10.1")
    implementation("androidx.recyclerview:recyclerview:1.4.0")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
    implementation("com.github.bumptech.glide:glide:4.16.0")
}
