## Firefox
* macOS: `mach_absolute_time`
  * absolute elapsed time since system boot
  * https://dxr.mozilla.org/mozilla-central/source/mozglue/misc/TimeStamp_darwin.cpp#48
* Posix:
  * `clock_gettime(CLOCK_MONOTONIC)`
  * https://dxr.mozilla.org/mozilla-central/source/mozglue/misc/TimeStamp_posix.cpp#73
  * according to https://pubs.opengroup.org/onlinepubs/9699919799/functions/clock_gettime.html,
    the base of mono time is unspecified while "does not change after system start-up time"
* Windows:
  * `QueryPerformanceCounter()`, or fallback to `GetTickCount64()`
    * `QueryPerformanceCounter`: the total number of ticks since the Windows operating system was started,
      including the time when the machine was in a sleep state such as standby, hibernate, or connected standby
    * `GetTickCount64`: milliseconds that have elapsed since the system was started
    * https://dxr.mozilla.org/mozilla-central/source/mozglue/misc/TimeStamp_windows.cpp#489

## Chrome
* macOS:
  * iOS:
    * `clock_gettime(CLOCK_MONOTONIC)` since iOS 10 (2016), or subtract `boottime` from `CFAbsoluteTimeGetCurrent()`
    * https://opensource.apple.com/source/Libc/Libc-1158.1.2/gen/clock_gettime.c.auto.html calls `_mach_boottime_usec`
    * it's said on macOS mojave, `mach_absolute_time` stops while the device is sleeping in line 75
    * according to https://www.unix.com/man-page/mojave/3/clock_getres/,
      mono time "will continue to increment while the system is asleep".
  * others:
    * `mach_absolute_time()`, which is safe even considering about sleeps
  * https://source.chromium.org/chromium/chromium/src/+/master:base/time/time_mac.cc;l=63?q=ComputeCurrentTicks
* Posix:
  * `clock_gettime(CLOCK_MONOTONIC)`
  * https://source.chromium.org/chromium/chromium/src/+/master:base/time/time_now_posix.cc;l=89
* Windows:
  * `QueryPerformanceCounter()`
  * https://source.chromium.org/chromium/chromium/src/+/master:base/time/time_win.cc;l=165


# Related

## Chromium Bug 166153

In https://bugs.chromium.org/p/chromium/issues/detail?id=166153, they want to use CLOCK_BOOTTIME or some others instead.

## Precision

`.now + .timeOrigin - Date.now()` will be big if system date time gets updated (like by NTP service).

Here's a page to test the difference: http://persistent.info/web-experiments/performance-now-sleep/ .

## `mach_absolute_time`
* **TEST NEEDED**
* stops during a sleep on a PowerPC CPU, but not on an Intel CPU,
  according to https://www.python.org/dev/peps/pep-0418/#mach-absolute-time
* Firefox 3.6.28 is the last version of Firefox that works with Mac OS X and PowerPC
  * https://support.mozilla.org/en-US/kb/firefox-no-longer-works-mac-os-10-4-or-powerpc
* As for Chromium, there's https://launchpad.net/ubuntu/xenial/powerpc/chromium-browser-l10n (16.04), but not on 18.04
* Apple released Mac OS X v10.6 "Snow Leopard" on August 28, 2009 as Intel-only
  * https://en.wikipedia.org/wiki/Mac_transition_to_Intel_processors
  * Mac OS X v10.7 "Lion" dropped support for Rosetta (a dynamic binary translator)
* It seems that Chrome doesn't support PowerPC now
