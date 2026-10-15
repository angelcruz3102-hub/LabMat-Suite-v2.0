package com.labmat.suite.web

import android.webkit.WebSettings
import android.webkit.WebView

object WebViewConfig {
    fun apply(webView: WebView) {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = false
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            mediaPlaybackRequiresUserGesture = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }
        @Suppress("DEPRECATION")
        webView.settings.allowFileAccessFromFileURLs = true
        @Suppress("DEPRECATION")
        webView.settings.allowUniversalAccessFromFileURLs = false
        webView.isScrollbarFadingEnabled = true
        webView.overScrollMode = WebView.OVER_SCROLL_IF_CONTENT_SCROLLS
    }
}
