/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

package de.tobiasreithmeier.storyweaver

import android.content.Context
import android.webkit.WebView
import kotlinx.coroutines.suspendCancellableCoroutine
import org.json.JSONArray
import org.json.JSONObject
import kotlin.coroutines.resume

/**
 * A book being played, over the host protocol of HOSTS 8.
 *
 * The story logic is not written twice, and not a third time either. This
 * hands `story-weaver.js` to a JavaScript engine Android already has and speaks
 * the same protocol the iOS host speaks: one command in, the whole view out,
 * both as text. Principle 5 is the reason - seed plus counter has to produce
 * the same die here as in a browser and on a phone of the other kind, and one
 * implementation cannot disagree with itself.
 *
 * The engine is a `WebView` with nothing loaded into it. That sounds odd for a
 * game with no web page in it, and it is the honest choice: every Android
 * device has one, it needs no dependency, and `evaluateJavascript` is exactly
 * the string-in-string-out bridge of 12.8. `androidx.javascriptengine` is the
 * tidier door and is not open on every device this has to run on.
 *
 * Everything here is `suspend`, because that bridge is asynchronous and
 * pretending otherwise would mean blocking the main thread. The runtime itself
 * is synchronous and single-threaded (12.9); it is the crossing that waits.
 */
class Story private constructor(
    private val web: WebView,
    /** Where the book's images are, for a view resolving `image` paths. */
    val directory: String?,
) {
    /** The current page, replaced by every command. */
    var view: JSONObject private set

    companion object {
        /**
         * Opens the two files `story-weaver bundle --out dir` wrote, from the
         * app's assets.
         *
         * @param assetDirectory the directory inside `assets/` holding
         *   `story.json` and `story-weaver.js`
         * @param seed fixes the dice so a playthrough replays exactly
         *   (principle 5); omit and the engine draws its own
         */
        suspend fun open(
            context: Context,
            assetDirectory: String,
            seed: Int? = null,
            language: String? = null,
        ): Story {
            val engine = context.assets.open("$assetDirectory/story-weaver.js")
                .bufferedReader().use { it.readText() }
            val story = context.assets.open("$assetDirectory/story.json")
                .bufferedReader().use { it.readText() }

            val web = WebView(context)
            web.settings.javaScriptEnabled = true
            // Nothing is ever loaded into it: no page, no network, no origin.
            // The engine is the only script that runs here.
            web.evaluateAsync(engine)

            val options = JSONObject().apply {
                seed?.let { put("seed", it) }
                language?.let { put("lang", it) }
            }
            val first = web.evaluateAsync(
                "inkleMd.start(${story.asJsString()}, ${options.toString().asJsString()})"
            )
            val instance = Story(web, assetDirectory)
            instance.view = instance.take(first)
            return instance
        }
    }

    init {
        view = JSONObject()
    }

    // --- playing ------------------------------------------------------------

    /** Answers the creation blocks and sets out. */
    suspend fun begin(picks: List<List<String>> = emptyList()) =
        send(JSONObject().put("cmd", "begin").put("picks", JSONArray(picks.map { JSONArray(it) })))

    suspend fun choose(index: Int) =
        send(JSONObject().put("cmd", "choose").put("index", index))

    /**
     * A boundary: brings host values in and runs whatever has come due (20).
     * Call it when the app comes back to the reader with time to hand over,
     * never once per frame - every boundary runs every scheduled event (12.9).
     */
    suspend fun advance(host: Map<String, Number> = emptyMap()) =
        send(JSONObject().put("cmd", "advance").put("host", JSONObject(host.toMap())))

    suspend fun attack() = send(JSONObject().put("cmd", "attack"))
    suspend fun testLuck() = send(JSONObject().put("cmd", "luck"))
    suspend fun flee() = send(JSONObject().put("cmd", "flee"))
    suspend fun undo() = send(JSONObject().put("cmd", "undo"))
    suspend fun use(item: String) = send(JSONObject().put("cmd", "use").put("id", item))
    suspend fun equip(item: String) = send(JSONObject().put("cmd", "equip").put("id", item))
    suspend fun setLanguage(code: String) = send(JSONObject().put("cmd", "language").put("lang", code))

    /**
     * Jumps to a node, for an app that already knows where it wants to be:
     * a chapter picker, or an episode entered from a map (12.6). Load the
     * character first - `go` rolls no stats.
     */
    suspend fun go(node: String) = send(JSONObject().put("cmd", "go").put("node", node))

    // --- saving -------------------------------------------------------------

    /** The save of SPEC 15, as the JSON a host writes wherever it likes. */
    suspend fun save(): JSONObject = send(JSONObject().put("cmd", "save")) as JSONObject

    suspend fun load(save: JSONObject) = send(JSONObject().put("cmd", "load").put("save", save))

    /**
     * Enters the book at a node with a character the app has been keeping
     * (12.6). Load first, then go: a reader who arrives by `go` alone has no
     * stats and dies of the first blow.
     */
    suspend fun enterEpisode(node: String, carrying: JSONObject?) {
        carrying?.let { load(it) }
        go(node)
    }

    // --- the bridge ---------------------------------------------------------

    /** One command, one view. `did` is whatever the command returned. */
    private suspend fun send(command: JSONObject): Any? {
        val answer = web.evaluateAsync("inkleMd.send(${command.toString().asJsString()})")
        return take(answer).let { view = it; lastDid }
    }

    private var lastDid: Any? = null

    /**
     * The protocol answers `{ ok, view, did }` or `{ ok: false, error }`. A
     * refusal is data on the way over and an exception here, because on this
     * side there is a language that carries one.
     */
    private fun take(answer: String): JSONObject {
        val json = JSONObject(answer)
        if (!json.optBoolean("ok")) throw StoryRefused(json.optString("error", "unknown"))
        lastDid = if (json.isNull("did")) null else json.get("did")
        return json.getJSONObject("view")
    }
}

class StoryRefused(message: String) : Exception(message)

/**
 * `evaluateJavascript` hands its result to a callback, and the result of a
 * string expression comes back JSON-quoted. Both are undone here so the rest
 * of this file reads like the protocol it speaks.
 */
private suspend fun WebView.evaluateAsync(script: String): String =
    suspendCancellableCoroutine { continuation ->
        evaluateJavascript(script) { raw ->
            val text = when {
                raw == null || raw == "null" -> ""
                raw.startsWith("\"") -> JSONArray("[$raw]").getString(0)
                else -> raw
            }
            continuation.resume(text)
        }
    }

/** A JavaScript string literal, quoted the way JSON quotes one. */
private fun String.asJsString(): String = JSONArray().put(this).toString().let {
    it.substring(1, it.length - 1)
}
