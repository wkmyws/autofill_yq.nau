let config = {
  usr: "",//账号
  pwd: "",//密码
  browser: 'chrome.exe',//本地浏览器地址
  vrCode: null,
  body_tem: 36.9 + Math.round(Math.random() * 3 - 1) / 10,
}

const puppeteer = require('puppeteer-core');
const { recognize } = require('./svg-captcha-recognize/index')
const cookies = [
  {
    'domain': 'yq2.nauvpn.cn',
    //'path': '/',
    'name': 'NSYQJK-ISSHOWTIPNEXTTIME',
    'value': '{%22isNotShowNext%22:true%2C%22isAccept%22:true}',
  },
];
const autoFillIn = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: config.browser,
  });
  const page = await browser.newPage();
  await page.setCookie(...cookies)
  await page.goto('http://yq2.nauvpn.cn/login', {
    waitUntil: 'networkidle0'
  });
  //验证码
  const vrCodeVR = async () => {
    let html = await page.content();
    let svg_dom = ""; html.replace(/<svg.+<\/svg>/, (all) => svg_dom = all)
    config.vrCode = recognize(svg_dom)
    console.log("confirm vrCode: " + config.vrCode)
    if (config.vrCode.length <= 3) {
      //需要重新获取验证码
      await page.click("svg")
      await page.waitFor(1000)
      await vrCodeVR()
    }
  }
  await vrCodeVR()

  await page.type("input[placeholder='请输入学号']", config.usr)
  await page.type("input[placeholder='请输入密码']", config.pwd)
  await page.type("input[placeholder='请输入验证码']", config.vrCode)



  await page.click("button[type='button']")

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
  let login_state = await nextPageVR()
  if (login_state == -1) {
    console.log("restart server...")
    await page.waitFor(500)
    await browser.close();
    return login_state
  }
  if (login_state == 1) {
    console.log("already fill in !")
    await page.waitFor(1000)
    await browser.close();
    return login_state
  }

  console.log("success login !")
  await page.waitFor(2000)
  await page.type("input[placeholder='请输入今日体温']", config.body_tem + "", { delay: 3 })
  await page.click("button[type='button']")
  console.log('success!')
  await page.waitFor(2000)
  await browser.close();
  return 0;
}


async function run() {
  let cc = await autoFillIn()
  if (cc == -1) return await run()
  return 0

}
(async () => {
  await run()
})()
