package com.ecotell.pruthashakti;

import android.Manifest;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    private static final int PERMISSION_REQUEST_CODE = 1001;
    private static final String PREFS_NAME = "pruthashakti_prefs";
    private static final String PREF_ASKED_ONCE = "permissions_asked_once";

    // Camera + location back the Register Farmer wizard's photo capture
    // (GPS/time watermarked) and location auto-fill. Capacitor's built-in
    // BridgeWebChromeClient already requests these on demand the first time
    // the web page calls getUserMedia()/navigator.geolocation, but that
    // first ask can land awkwardly mid-form. Asking here at launch means
    // the decision is usually already made by the time the user reaches
    // that step.
    private static final String[] REQUIRED_PERMISSIONS = {
        Manifest.permission.CAMERA,
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION
    };

    private long pendingDownloadId = -1;
    private BroadcastReceiver downloadReceiver;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestMissingPermissions();
        getBridge().getWebView().addJavascriptInterface(new UpdateBridge(), "AndroidUpdater");
        registerDownloadReceiver();
    }

    @Override
    public void onDestroy() {
        if (downloadReceiver != null) {
            try {
                unregisterReceiver(downloadReceiver);
            } catch (IllegalArgumentException ignored) {
                // Already unregistered — fine.
            }
        }
        super.onDestroy();
    }

    // ── Camera / Location runtime permissions ─────────────────────────

    private boolean hasPermission(String permission) {
        return ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestMissingPermissions() {
        List<String> missing = new ArrayList<>();
        for (String permission : REQUIRED_PERMISSIONS) {
            if (!hasPermission(permission)) {
                missing.add(permission);
            }
        }
        if (!missing.isEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toArray(new String[0]), PERMISSION_REQUEST_CODE);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != PERMISSION_REQUEST_CODE) {
            return;
        }

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        boolean askedBefore = prefs.getBoolean(PREF_ASKED_ONCE, false);
        prefs.edit().putBoolean(PREF_ASKED_ONCE, true).apply();

        // Capability-based, not permission-string-based: Android 12+ lets a user
        // pick "Approximate" location instead of "Precise" in the system dialog,
        // which denies ACCESS_FINE_LOCATION specifically while still granting
        // ACCESS_COARSE_LOCATION. That is a legitimate choice, not a denial —
        // Capacitor's WebChromeClient already falls back to coarse location
        // correctly — so checking each permission string individually would
        // wrongly treat "Approximate" as "permanently denied". Only flag it
        // when camera is gone, or *both* location permissions are gone.
        boolean cameraOk = hasPermission(Manifest.permission.CAMERA);
        boolean locationOk =
            hasPermission(Manifest.permission.ACCESS_FINE_LOCATION) ||
            hasPermission(Manifest.permission.ACCESS_COARSE_LOCATION);

        // shouldShowRequestPermissionRationale() returns false both before the
        // very first ask and after a permanent ("don't ask again") denial —
        // the askedBefore flag is what tells those two cases apart.
        boolean cameraPermanentlyDenied =
            !cameraOk &&
            !ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.CAMERA) &&
            askedBefore;
        boolean locationPermanentlyDenied =
            !locationOk &&
            !ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.ACCESS_FINE_LOCATION) &&
            !ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.ACCESS_COARSE_LOCATION) &&
            askedBefore;

        // Once permanently denied, Android will never show its own dialog again
        // — Capacitor's WebChromeClient will then silently fail every camera/
        // location request from here on with nothing telling the user why.
        // Send them to the one place left that can fix it.
        if (cameraPermanentlyDenied || locationPermanentlyDenied) {
            showOpenSettingsDialog(
                "Camera & Location Access Needed",
                "Pruthashakti needs Camera and Location access to capture farmer photos and GPS-tag them " +
                "during registration. This was previously denied, so Android will not prompt again " +
                "automatically. Please open Settings and enable Camera and Location for this app.",
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.fromParts("package", getPackageName(), null)
            );
        }
    }

    private void showOpenSettingsDialog(String title, String message, String action, Uri data) {
        new AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton("Open Settings", (dialog, which) -> {
                Intent intent = new Intent(action);
                intent.setData(data);
                startActivity(intent);
            })
            .setNegativeButton("Not Now", (dialog, which) -> dialog.dismiss())
            .setCancelable(true)
            .show();
    }

    // ── In-app APK update flow ─────────────────────────────────────────
    // The app is sideloaded, not distributed through the Play Store, so
    // there is no store-provided update mechanism. The web app fetches
    // /app-updates/latest.json itself (plain static file, no native code
    // needed for that part) to decide whether an update exists, then calls
    // AndroidUpdater.downloadAndInstall() below to do the rest natively.
    // Android still requires the user to confirm the system install screen
    // by hand — a non-Play-Store app cannot silently self-install, by design.

    private void registerDownloadReceiver() {
        downloadReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (id != pendingDownloadId) return;
                promptInstall(pendingDownloadId);
            }
        };
        ContextCompat.registerReceiver(
            this,
            downloadReceiver,
            new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE),
            ContextCompat.RECEIVER_EXPORTED
        );
    }

    private void promptInstall(long downloadId) {
        DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
        Uri downloadedUri = dm.getUriForDownloadedFile(downloadId);
        if (downloadedUri == null) {
            notifyWeb("failed", "Download did not complete.");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getPackageManager().canRequestPackageInstalls()) {
            showOpenSettingsDialog(
                "Allow Installing Updates",
                "To install the update you just downloaded, allow Pruthashakti to install apps from this " +
                "source on the next screen, then come back and tap Update again.",
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getPackageName())
            );
            notifyWeb("failed", "Enable install permission, then try again.");
            return;
        }

        notifyWeb("installing", "");
        Intent installIntent = new Intent(Intent.ACTION_VIEW);
        installIntent.setDataAndType(downloadedUri, "application/vnd.android.package-archive");
        installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivity(installIntent);
    }

    private void notifyWeb(String status, String message) {
        runOnUiThread(() -> {
            String js =
                "window.onAndroidUpdateStatus && window.onAndroidUpdateStatus(" +
                jsonString(status) + ", " + jsonString(message) + ");";
            getBridge().getWebView().evaluateJavascript(js, null);
        });
    }

    private String jsonString(String s) {
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private class UpdateBridge {

        @JavascriptInterface
        public int getVersionCode() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
            } catch (PackageManager.NameNotFoundException e) {
                return -1;
            }
        }

        @JavascriptInterface
        public String getVersionName() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (PackageManager.NameNotFoundException e) {
                return "";
            }
        }

        @JavascriptInterface
        public void downloadAndInstall(final String apkUrl) {
            runOnUiThread(() -> {
                try {
                    DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(apkUrl));
                    request.setTitle("Pruthashakti update");
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    request.setDestinationInExternalFilesDir(
                        MainActivity.this,
                        Environment.DIRECTORY_DOWNLOADS,
                        "pruthashakti-update.apk"
                    );
                    pendingDownloadId = dm.enqueue(request);
                    notifyWeb("downloading", "");
                } catch (Exception e) {
                    notifyWeb("failed", e.getMessage() == null ? "Download failed." : e.getMessage());
                }
            });
        }
    }
}
