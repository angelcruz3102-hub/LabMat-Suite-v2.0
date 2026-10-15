package com.labmat.suite.web

import android.app.Activity
import android.content.Context
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast

class WebAppInterface(
    private val context: Context,
    private val webView: WebView
) {
    @JavascriptInterface
    fun toast(message: String) {
        Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
    }

    @JavascriptInterface
    fun onChapterChanged(chapterId: String, chapterTitle: String) {
        (context as? Activity)?.runOnUiThread { context.title = chapterTitle }
    }

    @JavascriptInterface
    fun exitApp() { (context as? Activity)?.finish() }

    @JavascriptInterface
    fun getShellVersion(): String = "2.0.0"
}
