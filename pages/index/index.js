//index.js
//获取应用实例
const app = getApp()

const recorderManager = wx.getRecorderManager() //录音对象
const innerAudioContext = wx.createInnerAudioContext() //播放对象

Page({
  data: {
    motto: 'Hello World',
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),

    isSpeaking: false, //是否正在说话
    playUrl: '' //播放路径
  },
  //事件处理函数
  bindViewTap: function() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  onLoad: function () {
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      })
    } else if (this.data.canIUse){
      // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
      // 所以此处加入 callback 以防止这种情况
      app.userInfoReadyCallback = res => {
        this.setData({
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
            userInfo: res.userInfo,
            hasUserInfo: true
          })
        }
      })
    }
  },
  getUserInfo: function(e) {
    console.log(e)
    app.globalData.userInfo = e.detail.userInfo
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  },
  start: function(e) {
    console.log('开始录音11111')
    const options = {
      duration: 6000,
      format: 'mp3',

    }
    recorderManager.start(options)
    this.setData({
      isSpeaking: true
    })
  },
  stop: function(e) {
    console.log('结束录音')
    var that = this
    recorderManager.stop() //停止录音
    this.setData({
      isSpeaking: false
    })
    //监听录音结束事件
    recorderManager.onStop((res) => {
      console.log('监听录音结束事件', res)
      if (res.duration < 1000) {
        wx.showToast({
          title: '录音时间太短',
        })
        return
      } else {
        wx.showLoading({
          title: '发送中...',
        })

        var tempFilePath = res.tempFilePath //文件临时路径
        console.log('文件临时路径：', tempFilePath)

        that.setData({
          playUrl: tempFilePath
        })
        wx.hideLoading();

        // wx.uploadFile({
        //   filePath: 'tempFilePath',
        //   name: 'file',
        //   url: '', //上传服务器的地址
        //   header: {
        //     contentType: "multipart/form-data", //按需求增加
        //   },
        //   formData: null,
        //   success: function (res) {
        //     console.log("上传成功")
        //     wx.hideLoading();
        //     that.setData({
        //       playUrl: tempFilePath
        //     })
        //   },
        //   fail: function(err) {
        //     wx.hideLoading()
        //     console.log(err.errMsg)
        //   }
        // })
      }
    })
  },
  playRecord: function(e) {
    console.log('开始播放', e)
    innerAudioContext.src = this.data.playUrl
    innerAudioContext.play()

    //iOS静音时播放没有声音，默认为true，改为false就好了
    innerAudioContext.obeyMuteSwitch = false
    //播放结束
    innerAudioContext.onEnded(() => {
      innerAudioContext.stop()
    })

    wx.playVoice({
      filePath: 'voice',
    })
  }
})
