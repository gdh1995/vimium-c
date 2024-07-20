<a name="readme"></a><h2 align="center">
  <img src="icons/icon128.png" width="32" height="32" alt="" />
  <span style="color: #2f508e;">Vim</span>ium <span style="color: #a55e18;">C</span> - 全键盘操作浏览器
</h2>

[![版本](https://img.shields.io/badge/gdh1995-v1.99.993-critical?logo=GitHub
  )](https://github.com/gdh1995/vimium-c/releases)
[![Apache-2.0 许可协议](https://img.shields.io/badge/许可协议-Apache--2.0-blue)](LICENSE.txt)
[![GitHub 收藏](https://img.shields.io/github/stars/gdh1995/vimium-c?logo=GitHub&label=收藏&labelColor=181717&color=critical
  )](https://github.com/gdh1995/vimium-c/stargazers)
[![Gitee 收藏](https://gitee.com/gdh1995/vimium-c/badge/star.svg?theme=dark
  )](https://gitee.com/gdh1995/vimium-c/stargazers)

[![Firefox 101+](https://img.shields.io/amo/v/vimium-c@gdh1995.cn?logo=Firefox%20Browser&logoColor=white&label=Firefox%20101%2B&labelColor=FF7139
  )](https://addons.mozilla.org/firefox/addon/vimium-c/?src=external-readme)
[![用户数](https://img.shields.io/amo/users/vimium-c@gdh1995.cn?logo=Firefox%20Browser&logoColor=white&label=用户数&labelColor=FF7139
  )](https://addons.mozilla.org/firefox/addon/vimium-c/?src=external-readme)
[![评分](https://img.shields.io/amo/rating/vimium-c@gdh1995.cn?logo=Firefox%20Browser&logoColor=white&label=评分&labelColor=FF7139&color=blue
  )](https://addons.mozilla.org/firefox/addon/vimium-c/reviews/?src=external-readme)
[![Edge 102+](https://img.shields.io/badge/dynamic/json?logo=Microsoft%20Edge&label=Edge%20102%2B&prefix=v&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Faibcglbfblnogfjhbcmmpobjhnomhcdo
  )](https://microsoftedge.microsoft.com/addons/detail/aibcglbfblnogfjhbcmmpobjhnomhcdo)
[![用户数](https://img.shields.io/badge/dynamic/json?logo=Microsoft%20Edge&label=用户数&query=%24.activeInstallCount&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Faibcglbfblnogfjhbcmmpobjhnomhcdo
  )](https://microsoftedge.microsoft.com/addons/detail/aibcglbfblnogfjhbcmmpobjhnomhcdo)
[![评分](https://img.shields.io/badge/dynamic/json?logo=Microsoft%20Edge&label=评分&query=%24.averageRating&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Faibcglbfblnogfjhbcmmpobjhnomhcdo
  )](https://microsoftedge.microsoft.com/addons/detail/aibcglbfblnogfjhbcmmpobjhnomhcdo)
[![Chrome 102+](https://img.shields.io/chrome-web-store/v/hfjbmagddngcpeloejdejnfgbamkjaeg?logo=Google%20Chrome&logoColor=white&label=Chrome%20102%2B&labelColor=4285F4&color=critical
  )](https://chrome.google.com/webstore/detail/vimium-c-all-by-keyboard/hfjbmagddngcpeloejdejnfgbamkjaeg)
[![用户数](https://img.shields.io/chrome-web-store/users/hfjbmagddngcpeloejdejnfgbamkjaeg?logo=Google%20Chrome&logoColor=white&label=用户数&labelColor=4285F4&color=critical
  )](https://chrome.google.com/webstore/detail/vimium-c-all-by-keyboard/hfjbmagddngcpeloejdejnfgbamkjaeg)
[![评分](https://img.shields.io/chrome-web-store/rating/hfjbmagddngcpeloejdejnfgbamkjaeg?logo=Google%20Chrome&logoColor=white&label=评分&labelColor=4285F4&color=critical
  )](https://chrome.google.com/webstore/detail/vimium-c-all-by-keyboard/hfjbmagddngcpeloejdejnfgbamkjaeg)

**在 [Firefox 附加组件](https://addons.mozilla.org/firefox/addon/vimium-c/?src=external-readme) /
[Microsoft Edge 加载项](https://microsoftedge.microsoft.com/addons/detail/aibcglbfblnogfjhbcmmpobjhnomhcdo) /
[Chrome 网上应用店](https://chrome.google.com/webstore/detail/vimium-c-all-by-keyboard/hfjbmagddngcpeloejdejnfgbamkjaeg
  ) 中查看**

Vimium C 是一款开源、免费的键盘增强类浏览器扩展，支持为多种多样的命令任意设置快捷键。
只要有键盘，您就能自由点击网页中的链接和按钮、选择和复制文字和网址，也能轻松操作浏览器标签页，
还能在一个便捷的搜索框中随意搜索历史记录、收藏夹和打开的标签页等等。

Vimium C 支持 Firefox 101+、新版 Microsoft Edge 102+ 和 Chrome 102+ 等现代浏览器；
如果从源码重新编译，还可以支持 Chromium 32~108 和 Firefox 63~100。

本项目的前身是[<span style="color: #2f508e;">Vim</span>ium](https://github.com/philc/vimium
  )。和其相比，除了大量细节改进、新增很多命令参数外，Vimium C 添加了完整的 <span style="color: #a55e18;">中文
  </span>支持、[分场景映射](https://github.com/gdh1995/vimium-c/wiki/Map-a-key-to-different-commands-on-different-websites
  )、[全局快捷键](https://github.com/gdh1995/vimium-c/wiki/Trigger-commands-in-an-input-box#user-content-shortcut
  )和[命令序列](https://github.com/gdh1995/vimium-c/wiki/Auto-run-a-tree-of-commands
  )功能，还能运行在某些接受 Vimium C 的扩展程序的私有页面里，并且对CPU和内存资源的<span
    style="color: #a55e18;">消耗很低</span>。

本项目主要由 [gdh1995](https://github.com/gdh1995) 开发并维护，
且以 [Apache-2.0 许可协议](LICENSE.txt) 开源。
除部分源自 [Vimium](https://github.com/philc/vimium) 的以 MIT 许可协议 开源的英文语句外，
本项目的翻译文件（[_locales/](https://github.com/gdh1995/vimium-c/tree/master/_locales) 文件夹）归属于
[CC-BY-SA-4.0](https://creativecommons.org/licenses/by-sa/4.0/)（创作共用-署名-相同方式共享 4.0）协议。

本项目的主仓库是 https://github.com/gdh1995/vimium-c 和 https://gitee.com/gdh1995/vimium-c 。

Vimium C 的部分旧代码以 MIT 许可协议开源，可以前往 https://github.com/gdh1995/vimium-c/tree/MIT-licensed-v1 获得源码。

[Here's its description in English](README.md)（点击查看英文介绍）。

# 主要功能

## 多种多样的命令

它支持 Vimium 已有的所有命令和一些专有新命令，具体命令列表请参考安装后设置界面的帮助对话框。
而且同一个快捷键能在不同网站上分别触发各自的命令，也可以基于当前键盘焦点处的页面元素来触发不同命令。

支持很多网页上的常用操作：
* 按 F 自动发现并标出可点击的链接和按钮，输入一个定位标记上的文字就能点击它
* 按 字母O 可以显示一个方便美观的搜索框，在里边可以随意查找浏览历史和收藏的网页，还能自定义搜索引擎来快速打开搜索页面、
  查找已打开的标签页、实时计算数学表达式等等。甚至可以按 Shift+Enter（上档键+回车）来删除选中的历史记录。
* 按 J/K/H/L 来像 VIM 里移动光标一样滚动屏幕内容
* 按 “/” 显示页内查找浮层，输入 “\r” 可以做正则查找，“\w” 会执行整词匹配，还有 \R、\W、\i 和 \I 等多种用法
* 按 V 进入自由选择模式后，能像 VIM 一样用 J/K/H/L 等快捷键修改文字的选择范围
* 按 “?” 显示帮助对话框，快速查看所有设置过的快捷键

当需要操作浏览器标签页时，部分默认快捷键是：
* 按 Shift+J、Shift+K、“g0” 或 “g$” 来切换到左侧、右侧、最左或最右的标签页
* 按 “^”（Shift+6）切换到最近访问的上一个标签页
* 按 X 关闭当前网页，然后按 Shift+X 可以恢复它。关闭网页时默认会保留一个窗口来避免浏览器退出
* 按 “M+字母” 创建标记，在别的网页就可以按 “`+字母” 切换到（或者打开）这个标记的网页
* 按 R 刷新网页，Shift+W 移动网页到下一个窗口，“yt” 复制标签页

以上所有快捷键都可以解绑或重新绑定其它命令，也可以添加新的快捷键。
绑定快捷键到新的命令后，还可以做到切换网页静音、丢弃其它网页、切换网站的图片/JS功能权限、在无痕模式中重新打开等等。

## 快捷键高级用法

大部分命令都支持按下数字前缀来设置数量。比如 “5” 后跟 “Shift+X” 可以恢复 5 个最近关闭的标签页，
而依次按下 “-15X” 这 4 个键则会关闭当前和左侧的共 15 个标签页。
很多命令都支持通过参数来改变具体的操作细节，可以在自定义快捷键指定参数。

如果需要在某些网页上停用特定的快捷键，可以在扩展设置页面里指定相关规则。
筛选网址时可使用正则表达式，指定的快捷键列表支持“只停用列表内”和“列表外全停用”（此时列表以 “^” 开头）两种模式。

普通快捷键是通过 JavaScript 脚本程序识别的，存在被其它模块拦截的可能性，也无法在一些浏览器内置页面上使用。
如果需要让快捷键在浏览器的任何地方都生效，Vimium C 提供了 8 个全局快捷键，可以自由绑定到任意所需命令上。
但要注意全局快捷键不支持按网址规则停用。

Vimium C 还提供了一个用于浏览器地址栏的搜索引擎 “v”，在地址栏输入 “v + 空格” 即可进入搜索模式。
此模式类似于按 字母O 显示的搜索框，会自动搜索历史记录和收藏夹，也能指定搜索引擎拼接想要的网址。
输入 “v + 空格 + :t + 空格 + 关键词” 即会在已打开的标签页中搜索。

## 中文处理的优化

* 支持识别网址中 GBK 编码的汉字（比如百度贴吧网址的贴吧名）进而在搜索框中搜索，可以自定义要识别的编码
* 在自由选择模式中，使用 w、e、b 等处理词语的快捷键时，会在中文词语的开始/结束位置处停顿
* 浏览器语言设置为中文时，默认设置“百度搜索”为默认搜索引擎
* “上一页”和“下一页”功能默认会识别中文里常用于翻页按钮的词语

## 安全与隐私

Vimium C 具有完善的安全机制：
* 处理网页内容时，及时清理使用痕迹，执行命令期间的文字输入、操作结果等等都会被很快丢弃
* 上述搜索框支持设置屏蔽词来隐藏部分搜索结果（主动搜索了某屏蔽词时则不隐藏）
* 当它收到来自其它扩展程序的消息时，会按照一份用户指定的受信任扩展标识符的列表来审核消息来源
* 可以关闭“借助浏览器云服务同步配置”的功能，且此同步功能不会同步页内查找历史等信息

## 与其它扩展协同工作

* PDF Viewer for Vimium C （支持 Vimium C 的 PDF 阅读器）
  * 基于 [PDF.js](https://github.com/mozilla/pdf.js/) 修改并发布，可以代替应用商店里的 [PDF Viewer](
      https://chrome.google.com/webstore/detail/pdf-viewer/oemmndcbldboiebfnladdacbdfmadadm)
  * 在 [Chrome 网上应用店](
      https://chrome.google.com/webstore/detail/pdf-viewer-for-vimium-c/nacjakoppgmdcpemlfnfegmlhipddanj) 上查看
  * 项目主页：[vimium-c-helpers/pdf-viewer](https://gitee.com/gdh1995/vimium-c-helpers/tree/master/pdf-viewer)
* 新标签页修改器
  * 接管浏览器的新标签页设置，转为打开一个可以随意修改的网址
  * 在 [Firefox 附加组件](https://addons.mozilla.org/firefox/addon/newtab-adapter/?src=external-vc-readme) 和
    [Chrome 网上应用店](https://chrome.google.com/webstore/detail/newtab-adapter/cglpcedifkgalfdklahhcchnjepcckfn) 上查看
  * 项目主页：[vimium-c-helpers/newtab](https://gitee.com/gdh1995/vimium-c-helpers/tree/master/newtab#git-readme)
* 快捷键补充工具
  * 提供 32 个可全局绑定的快捷键，快捷键被触发时通知其它扩展（比如 Vimium C）执行相应操作
  * 在
    [Firefox 附加组件](https://addons.mozilla.org/firefox/addon/shortcut-forwarding-tool/?src=external-vc-readme) 和
    [Chrome 网上应用店](
      https://chrome.google.com/webstore/detail/shortcut-forwarding-tool/clnalilglegcjmlgenoppklmfppddien) 上查看
  * 项目主页：[vimium-c-helpers/shortcuts](https://gitee.com/gdh1995/vimium-c-helpers/tree/master/shortcuts#git-readme)
* 微度新标签页修改版
  * [www.weidunewtab.com](http://www.weidunewtab.com/)（英文网址：[www.newtabplus.com](
      http://www.newtabplus.com/)）的修改精简版，界面文字只保留了中文翻译
  * 此版本不接管浏览器新标签页设置，如需接管新标签页，推荐使用 [新标签页修改器](
      https://chrome.google.com/webstore/detail/newtab-adapter/cglpcedifkgalfdklahhcchnjepcckfn) 等扩展
  * 在 [Chrome 网上应用店](
      https://chrome.google.com/webstore/detail/微度新标签页修改版/hdnehngglnbnehkfcidabjckinphnief) 上查看


<a name="changelog"></a>

# 更新说明

参见 [RELEASE-NOTES.md](RELEASE-NOTES.md)（暂仅提供英文说明）。


<a name="donate"></a><a name="donating"></a><a name="donation"></a>

# 捐赠 / Donating


Vimium C 是一款开源的浏览器扩展程序，任何人都可以安装使用它而无需支付任何费用。
如果您确实想要资助它的开发者（[gdh1995@qq.com](https://github.com/gdh1995)），
可以通过[支付宝](https://www.alipay.com/)、[微信](https://weixin.qq.com/)、[Open Collective](
    https://opencollective.com/vimium-c)
或 [PayPal](https://www.paypal.me/gdh1995) 无偿赠与他一小笔钱。谢谢您的支持！

Vimium C is an open-source browser extension, and everyone can install and use it free of charge.
If you indeed want to give its author ([gdh1995@qq.com](https://github.com/gdh1995)) financial support,
you may donate any small amount of money to him through
  [Open Collective](https://opencollective.com/vimium-c), [PayPal](https://www.paypal.me/gdh1995),
  [Alipay](https://intl.alipay.com/) or [WeChat](https://www.wechat.com/). Thanks a lot!


部分捐赠列表详见 / A partial donation list is in : https://github.com/gdh1995/vimium-c/wiki/Donation-List .

<img width="240" alt="gdh1995 的支付宝二维码" src="https://gdh1995.cn/alipay-recv-money.png"
  /> <img width="240" alt="gdh1995 的微信赞赏码" src="https://gdh1995.cn/wechat-recv-money.png"
  /> <img width="240" alt="PayPal QRCode of gdh1995" src="https://gdh1995.cn/paypal-recv-money.png" />

# 针对适用区域的声明

[Vimium C](https://microsoftedge.microsoft.com/addons/detail/vimium-c/aibcglbfblnogfjhbcmmpobjhnomhcdo
)（和 [gdh1995](https://github.com/gdh1995) 发布的其他扩展）在被发布到“Microsoft Edge 加载项”和“Chrome
网上应用店”等商店上时，均已向 *所有地区* 的所有人公开。
但这个行为只是为了让这些插件更容易使用，**并不代表或者暗示**作者 gdh1995 “同意或者不反对”“台湾”一词可以同“中国”并列。
虽然并列显示这一现状的确**错误地出现**在了这些商店的（开发者）页面中（于2021年6月3日确认）。

根据[《中华人民共和国宪法》](http://www.npc.gov.cn/npc/c505/201803/e87e5cd7c1ce46ef866f4ec8e2d709ea.shtml
    )和国际共识，***台湾是中华人民共和国的神圣领土（不可分割）的一部分***。

# 其它

https://gitee.com/gdh1995/vimium-c 和 https://github.com/gdh1995/vimium-c 公开了项目源码、版本更新历史、操作手册（Wiki）等。
如果遇到任何使用上的问题或者有新的功能意见和建议，都可以去仓库的“issues”页面上提出。
