//index.js

//引入插件 微信同声传译
const plugin = requirePlugin('WechatSI')
const manager = plugin.getRecordRecognitionManager();
// 设置采集声音参数
const options = {
  sampleRate: 44100,
  numberOfChannels: 1,
  encodeBitRate: 192000,
  format: 'mp3',
  lang: 'zh_CN',// 识别的语言，目前支持zh_CN en_US zh_HK sichuanhua
}
//获取应用实例
const app = getApp()
var msgList = [];
var inputVal = '';
var sendResult = '';
var windowWidth = wx.getSystemInfoSync().windowWidth;
var windowHeight = wx.getSystemInfoSync().windowHeight;
var keyHeight = 0;
var tips = '';
//上传服务器的地址
// const requestURL = 'http://192.168.0.13:8042/upload_voice'
const requestURL = 'https://ai.datacvg.com/aivoice/upload_voice'


//获取全局唯一的语音识别管理器recordRecoManager
const recorderManager = wx.getRecorderManager() //录音对象
const innerAudioContext = wx.createInnerAudioContext() //播放对象


/**
 * 初始化数据
 */
function initData(that) {
  inputVal = '';
  sendResult = '';
  tips = '您好，您可以这样问我：\n1.2019年10月航天南洋经营状况\n2.航天南洋位置\n3.2019年10月高新区经济状况\n4.2019年10月高新区规上企业税收收入大于1000万元的企业分布情况\n5.2019年10月高新区规上企业税收收入大于1000万元的企业列表',
  
  msgList = [{
      speaker: 'server',
      contentType: 'text',
      content: tips
    },
  ]
  that.setData({
    msgList,
    inputVal
  })
}

Page({
  /**
   * 页面的初始数据
   */
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

    startTime: '',
    endTime: '',
    tips: ['1.“时间”“企业名称”的经营状况',
           '2.“企业名称”的位置',
           '3.“时间“，“区域”的经济状况', 
           '4.“区域”“标签”“指标以及范围”的企业分布情况', 
           '5.“时间”“区域”“标签”“指标以及范围”的企业列表'
          ],

    scrollHeight: '100vh',
    inputBottom: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function () {
    //识别语音
    this.initRecord();
    //初始化数据
    initData(this);
        
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
  },
  getUserInfo: function(e) {
    console.log(e)
    app.globalData.userInfo = e.detail.userInfo
    this.setData({
      isLogin: true,
      userInfo: e.detail.userInfo,
      hasUserInfo: true,
    })
  },
  //调接口
  uploadText() {
    let that = this
    wx.request({
      // method: "POST",
      url: requestURL,
      header: {
        contentType: "application/json", //按需求增加
      },
      data: {
        user_id: '10001',//（String，用户id）
        voice_t: this.data.text,//（String，语音文本）
      },
      success: function (res) {
        console.log("上传成功 res=" + res)
        if (res.data["code"] == '200') {
          let text = res.data.data["text"]
          that.sendResult(text)
        } else {
          that.sendResult('对不起，我没有听懂。')
        }
      },
      fail: function(err) {
        that.sendResult('对不起，我没有听懂。')
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
      if (that.data.endTime - that.data.startTime >= 500) {
        wx.showToast({
          title: '听不清楚，请重新说一遍',
        })
        if (that.data.recordState == true) {
          manager.stop()
          this.setData({
            recordState: false  //录音状态
          })
        }
      }
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

      //语音转换成功 用户发言
      that.sendClick(text)
      //上传语音文字
      that.uploadText()
    }
  },
  // 按住说话
  touchStart: function (e) {
    // 同声传译语音开始识别
    manager.start(options)
    // ({
    //   lang: 'zh_CN',// 识别的语言，目前支持zh_CN en_US zh_HK sichuanhua
    // })
    this.setData({
      startTime: e.timeStamp,
      recordState: true  //录音状态
    })
  },
  // 动作被打断，如弹窗和来电提醒
  touchCancel: function (e) {
        // 语音结束识别
        manager.stop();

        this.setData({
          stop: e.timeStamp,
          recordState: false  //录音状态
        })
  },
  //语音  --松开结束
  touchEnd: function (e) {
    // 语音结束识别
    manager.stop();

    this.setData({
      recordState: false,
      endTime: e.timeStamp
    })

    if (this.data.endTime - this.data.startTime < 500) {
      wx.showToast({
        title: '说话时间过短',
      })
    }
  },

  touchTap: function (e) {
    let that = this
    if (that.data.recordState == false) {
      that.touchStart(e)
    } else {
      that.touchEnd(e)
      
    }
  },

  /**
   * 获取聚焦
   */
  focus: function(e) {
    keyHeight = e.detail.height;
    this.setData({
      scrollHeight: (windowHeight - keyHeight) + 'px'
    });
    this.setData({
      toView: 'msg-' + (msgList.length - 1),
      inputBottom: keyHeight + 'px'
    })
    //计算msg高度
    // calScrollHeight(this, keyHeight);

  },

  //失去聚焦(软键盘消失)
  blur: function() {
    this.setData({
      scrollHeight: '100vh',
      inputBottom: 0
    })
    this.setData({
      toView: 'msg-' + (msgList.length - 1)
    })

  },

  /**
   * 发送点击监听
   */
  sendClick: function(text) {
    msgList.push({
      speaker: 'customer',
      contentType: 'text',
      content: text
    })
    inputVal = '';
    this.setData({
      msgList,
      inputVal
    });
    this.blur();
  },

  /**
   * 发送反馈
   */
  sendResult: function(text) {
    msgList.push({
      speaker: 'server',
      contentType: 'text',
      content: text
    })
    this.setData({
      msgList,
    });
  },

  /**
   * 退回上一页
   */
  toBackClick: function() {
    wx.navigateBack({})
  },

  /**
   * 点击发送提示
   */
  getTips: function(result) {
    let that = this
    msgList.push({
      speaker: 'server',
      contentType: 'text',
      content: tips
    })
    this.setData({
      msgList,
    });
    this.blur();
  },

  bindViewTap: function() {
    wx.navigateTo({
      url: '../../contact/contact'
    })
  },
})
