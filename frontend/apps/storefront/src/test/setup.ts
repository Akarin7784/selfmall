// jsdom 未实现 window.scrollTo（路由 scrollBehavior 会调用），测试里置空。
window.scrollTo = () => {}
