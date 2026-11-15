No Wasteful PoW
===============

A Safari extension for macOS and iOS that skips proof-of-work challenges, saving your time and battery.

The extension works by doing the following:

1. A content script checks every page for PoW challenges (currently Anubis).
2. When it finds one, that host gets added to a rule that sends a fake user agent, and the page reloads without the challenge.
3. From then on, that host never sees your real User-Agent.

If you are a sysadmin and think that it's acceptable to make users wait while wasting precious system resources on a protection so trivial to bypass that took the original author around 100 lines of code, you should consider switching to a crypto miner. At least you'd get some cash instead of a false sense of security.

Credits
-------

Based on [Anubypass](https://github.com/socram8888/anubypass) by socram8888.

License
-------

The code in this repo is available under the WTFPL:

```
        DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE 
                    Version 2, December 2004 

 Copyright (C) 2004 Sam Hocevar <sam@hocevar.net> 

 Everyone is permitted to copy and distribute verbatim or modified 
 copies of this license document, and changing it is allowed as long 
 as the name is changed. 

            DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE 
   TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION 

  0. You just DO WHAT THE FUCK YOU WANT TO.
```
