//index.js

//引入插件 微信同声传译
const plugin = requirePlugin('WechatSI')
const manager = plugin.getRecordRecognitionManager();

//获取应用实例
const app = getApp()

//获取全局唯一的语音识别管理器recordRecoManager
const recorderManager = wx.getRecorderManager() //录音对象
const innerAudioContext = wx.createInnerAudioContext() //播放对象

Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    isLogin: false, //是否登录
    text: '',
    fileUrl: '',
    //语音
    recordState: false, //录音状态
    content:'',//内容
  },
  bindViewTap: function() {
    wx.navigateTo({
      // url: '../recordToText/record-to-text'
    })
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function () {
    if (app.globalData.userInfo) {
      this.setData({
        isLogin: true,
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      })
    } else if (this.data.canIUse){
      // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
      // 所以此处加入 callback 以防止这种情况
      app.userInfoReadyCallback = res => {
        this.setData({
          isLogin: true,
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    } else {
      // 在没有 open-type=getUserInfo 版本的兼容处理
      wx.getUserInfo({
        success: res => {
          app.globalData.userInfo = res.userInfo
          this.setData({
            isLogin: true,
            userInfo: res.userInfo,
            hasUserInfo: true
          })
        }
      })
    }
    //识别语音
    this.initRecord();
  },
  getUserInfo: function(e) {
    console.log(e)
    app.globalData.userInfo = e.detail.userInfo
    this.setData({
      isLogin: true,
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  },
  //录音开始
  start: function() {
    console.log('开始录音11111')
    const options = {
      duration: 6000,
      format: 'wav',
      sampleRate: 16000, //采样率
      numberOfChannels: 1, //录音通道数
      encodeBitRate: 96000, //编码码率
    }
    recorderManager.start(options)
  },
  //录音结束
  stop: function() {
    console.log('结束录音')
    var that = this
    recorderManager.stop() //停止录音

    //监听录音结束事件
    recorderManager.onStop((res) => {
      console.log('监听录音结束事件', res)
 
        var tempFilePath = res.tempFilePath //文件临时路径
        console.log('文件临时路径：', tempFilePath)
       
        that.setData({
          fileUrl: tempFilePath
        })

        // setTimeout(function() {
          //上传
          that.upload()
        // }, 500)
    })
  },
  //调接口
  upload(){
    //上传文件
    wx.uploadFile({
      filePath: this.data.fileUrl,
      name: 'file',
      url: 'http://192.168.0.59:8080/upload_voice', //上传服务器的地址
      header: {
        contentType: "multipart/form-data", //按需求增加
      },
      formData: {
        user_id: '10001',//（String，用户id）
        voice_t: this.data.text,//（String，语音文本）
      },
      success: function (res) {
        console.log("上传成功")
      },
      fail: function(err) {
        console.log("上传失败")
        console.log(err.errMsg)
      }
    })
  },

  //  同声传译 
  //识别语音 -- 初始化
  initRecord: function () {
    const that = this;
    // 有新的识别内容返回，则会调用此事件
    manager.onRecognize = function (res) {
      console.log(res)
    }
    // 正常开始录音识别时会调用此事件
    manager.onStart = function (res) {
      console.log("成功开始录音识别", res)
    }
    // 识别错误事件
    manager.onError = function (res) {
      console.error("error msg", res)
    }
    //识别结束事件
    manager.onStop = function (res) {
      console.log('..............结束录音')
      console.log('录音临时文件地址 -->' + res.tempFilePath); 
      console.log('录音总时长 -->' + res.duration + 'ms'); 
      console.log('文件大小 --> ' + res.fileSize + 'B');
      console.log('语音内容 --> ' + res.result);
      if (res.result == '') {
        wx.showModal({
          title: '提示',
          content: '听不清楚，请重新说一遍！',
          showCancel: false,
          success: function (res) {}
        })
        return;
      }
      var text = res.result;
      that.setData({
        text: text,
        fileUrl: res.tempFilePath
      })

      // that.upload()
    }
  },
  // 按住说话
  touchStart: function (e) {
    this.setData({
      recordState: true  //录音状态
    })
    // 同声传译语音开始识别
    manager.start({
      lang: 'zh_CN',// 识别的语言，目前支持zh_CN en_US zh_HK sichuanhua
    })
    //录音同时开始
    // this.start()
  },
  //语音  --松开结束
  touchEnd: function (e) {
    this.setData({
      recordState: false
    })
    // 语音结束识别
    manager.stop();
    // this.stop()
  },
})
