## 定时填写疫情填报系统

### 用法示例

```powershell
git clone "https://github.com/wkmyws/autofill_yq.nau.git"
cd ".\autofill_yq.nau\"
npm i puppeteer
```

#### 修改账户密码配置：

打开`test.js`,找到`config`变量(第一行)

config中的usr和pwd的值为自己的学号、密码（字符串格式）

#### 运行

如果昨天没有填写疫情填报，则需要手动填写一次后才能自动填写

换句话说，就是第 i 天可以用此脚本自动填写的条件是 i-1 天手动或自动填写过疫情填报系统

- [x] 我已了解


```powershell
node "./test.js"
```

一个可能的运行结果如下所示：

```powershell
> node "./test.js"
confirm vrCode: Y7F4
restart server...
confirm vrCode: b2I
confirm vrCode: vGU
confirm vrCode: QWYd
restart server...
confirm vrCode: GPf
confirm vrCode: dYe
confirm vrCode: UnO
confirm vrCode: mm5
confirm vrCode: Umdd
restart server...
confirm vrCode: exdJ
already fill in !
>
```

#### 定时运行：

参见<a href="#定时填写">定时填写</a>

### 思路

> 爬取spa页面时，常规的get方法并不能正确获取到用户可见页面
>
> (提示\<noscript\>)，
>
> 为此，采用[puppter](https://zhaoqize.github.io/puppeteer-api-zh_CN/#/)来爬取

#### 安装

需要提前安装nodejs环境，不赘述

win环境：

```powershell
cd 指定目录 # 确保以下所有pw命令都在指定目录下运行
npm i puppeteer
```

linux环境除了上述命令外，

还需要安装别的依赖库

根据Linux的发行版自己安装

#### 爬取

新建 `test.js`，输入：

```javascript
const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('http://yq.nauvpn.cn/login',{
      waitUntil: 'networkidle0'
    });
    await page.screenshot({path: './example.png'});
    const html=await page.content();
    console.log(html)
    await browser.close();
  })();

```

`powershell`执行：

```powershell
node "\.test.js"
```

查看生成的`example.png`:

<img src="http://39.106.182.167:24680/img/upload_55e8cca501476d77ae944776fe2816ed.png" alt="image-20200803084313804" style="zoom: 50%;" />

看到下面那行红字就知道是cookie，查看cookie发现：

| name                     | value                                            |
| ------------------------ | ------------------------------------------------ |
| NSYQJK-ISSHOWTIPNEXTTIME | {%22isNotShowNext%22:true%2C%22isAccept%22:true} |

所以接下来我们注入cookie再次访问：

```javascript
const puppeteer = require('puppeteer');
const cookies = [
  {
    'domain': 'yq.nauvpn.cn',
    //'path': '/',
    'name': 'NSYQJK-ISSHOWTIPNEXTTIME',
    'value': '{%22isNotShowNext%22:true%2C%22isAccept%22:true}',
  },
];
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setCookie(...cookies)
    await page.goto('http://yq.nauvpn.cn/login', {
      waitUntil: 'networkidle0'
    });
    await page.screenshot({ path: './example.png' });
    const html = await page.content();
    console.log(html)
    await browser.close();
  })();

```

运行后生成的截图：

<img src="http://39.106.182.167:24680/img/upload_7add4f828cbb4b12296084839c87cb3e.png" alt="image-20200803085953271" style="zoom: 50%;" />

nice，接下来的难点是验证码，审查元素发现验证码为svg格式，

找到了一个识别svg验证码的库：[svg-captcha-recognize](https://github.com/haua/svg-captcha-recognize)

照着链接的步骤 install 后，我们只需要调用`recognize(csvText)`便能获取验证码

install:

```powershell
git clone "https://github.com/haua/svg-captcha-recognize.git"
npm install
```

```javascript
const puppeteer = require('puppeteer');
const { recognize } = require('./svg-captcha-recognize/index')
const cookies = [
  {
    'domain': 'yq.nauvpn.cn',
    'name': 'NSYQJK-ISSHOWTIPNEXTTIME',
    'value': '{%22isNotShowNext%22:true%2C%22isAccept%22:true}',
  },
];
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setCookie(...cookies)
    await page.goto('http://yq.nauvpn.cn/login', {
      waitUntil: 'networkidle0'
    });
    await page.screenshot({ path: './example.png' });
    const html = await page.content();
    let svg_dom="";html.replace(/<svg.+<\/svg>/,(all)=>svg_dom=all)
    const text = recognize(svg_dom)

    console.log(text)
    await browser.close();
  })();

```

log结果：`LyFJ`

界面图：![image-20200803093019153](http://39.106.182.167:24680/img/upload_21bd1701c3b1da246f118e7cffc8ac30.png)

但多试几次，这个正确率并不高

所以需要生成后验证验证码的正确性才能继续下一步

```javascript
const vrCodeVR = async () => {
    let html = await page.content();
    let svg_dom = ""; html.replace(/<svg.+<\/svg>/, (all) => svg_dom = all)
    config.vrCode = recognize(svg_dom)
    console.log(config.vrCode)
    if (config.vrCode.length <= 3) {
      //需要重新获取验证码
      await page.click("svg")
      await page.waitFor(1000)
      await vrCodeVR()
    }
  }
```

到此我们能得到可以被识别的4位验证码，我们尝试登录

下一步可能跳转到三个页面：

1. 填写信息页面(code=0)

   注入已经填好的信息，这里不赘述

   然后post数据，跳转到完成页面

2. 填写完成页面(code=1)

3. 原界面（验证码仍然错误）(code=-1)

通过不同页面的特殊元素来判断：

```javascript
  const nextPageVR = async () => {
    try {
      await page.waitForSelector("input[placeholder='请选择地址']", {
        waitUntil: 'networkidle0',
        timeout: 5000,
      })
      return 0
    } catch (ex) {
      const btnName = await page.$eval('button > span', el => el.innerHTML)
      if (btnName == "关闭") {
        return 1
      }
      return -1
    }
  }
```

当验证码仍然错误时，返回码为-1，我们重新运行这个函数，

否则视为登录成功，退出这个函数：

```javascript
async function run() {
  let cc = await autoFillIn()
  if(cc==-1)return await run()
  return 0
}
```

最后是程序的入口：

```javascript
(async()=>{
  await run()
})()
```

#### 定时填写

我们已经解决了一次填写的问题，下面要实现每天自动填写

以win为例，编写 `yq_autofill.bat`:

```bash
node ./test.js
```

然后利用win的[定时任务](https://www.cnblogs.com/wudequn/p/8353193.html)来设置定时填写的功能，定时任务的`程序或脚本地址`填写`yq_autofill.bat`的绝对路径即可

