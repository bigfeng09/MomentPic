package top.five915.momentpic;

import android.os.Handler;
import android.os.Looper;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

abstract class UiTask<Params, Progress, Result> {
    private static final ExecutorService IO = Executors.newFixedThreadPool(
            Math.max(2, Math.min(4, Runtime.getRuntime().availableProcessors())));
    private static final Handler MAIN = new Handler(Looper.getMainLooper());

    protected void onPreExecute() {
    }

    protected abstract Result doInBackground(Params... params);

    protected void onPostExecute(Result result) {
    }

    @SafeVarargs
    public final void execute(Params... params) {
        onPreExecute();
        IO.execute(() -> {
            Result result = doInBackground(params);
            MAIN.post(() -> onPostExecute(result));
        });
    }
}
