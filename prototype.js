require('dotenv').config({path: '.env'})
// require('dotenv').config({path: 'pthao.env'})
// require('dotenv').config({path: 'tquynh.env'})
// require('dotenv').config({path: 'lhuong.env'})

//---------------------------------------------
const HOST = 'http://dangkyhoc.vnu.edu.vn'
const LOGIN_URL = `${HOST}/dang-nhap`
const LOGOUT_URL = `${HOST}/Account/Logout`
const AVAILABLE_COURSES_DATA_URL_MAJOR = `${HOST}/danh-sach-mon-hoc/1/1`
const AVAILABLE_COURSES_DATA_URL_ALL = `${HOST}/danh-sach-mon-hoc/1/2`
const REGISTERED_COURSES_DATA_URL = `${HOST}/danh-sach-mon-hoc-da-dang-ky/1`
const CHECK_PREREQUISITE_COURSES_URL = `${HOST}/kiem-tra-tien-quyet/%s/1`
const CHOOSE_COURSE_URL = `${HOST}/chon-mon-hoc/%s/1/1`
const SUBMIT_URL = `${HOST}/xac-nhan-dang-ky/1`
const cheerio = require('cheerio')
const request = require('request')
const {getTime} = require('./utils')
const getRequest = require('./request/getRequest')
const postRequest = require('./request/postRequest')

const {PASSWORD, COURSES, USERID} = process.env

let _courses = COURSES.split(',').map((course) => course.trim())
let start = null
let end = null
let jar = null

async function logIn() {
  try {
    const getReqBody = await getRequest(LOGIN_URL, jar)
    const $ = cheerio.load(getReqBody)
    const token = $('input[type="hidden"]').val()
    const data = `__RequestVerificationToken=${token}&LoginName=${USERID}&Password=${PASSWORD}`
    const {response} = await postRequest(LOGIN_URL, data, jar)
    const cookies = `${response.headers['set-cookie']}`
    if (cookies.indexOf('ASP.NET') > -1) {
      return true
    }
    return false
  } catch (error) {
    console.error('Login Fn:', (error || {}).message || error)
  }
}

async function CheckNChoose(courseIDs) {
  try {
    await postRequest(CHECK_PREREQUISITE_COURSES_URL.replace('%s', courseIDs[0]), '', jar)
    await postRequest(CHOOSE_COURSE_URL.replace('%s', courseIDs[1]), '', jar)
    return true
  } catch (error) {
    console.log('Check N Choose:', error.message || error.code || error)
    return CheckNChoose(courseIDs)
  }
}

function getCourseID(availableCourseDatas, code) {
  if (typeof availableCourseDatas !== 'string' || !availableCourseDatas) return []
  const re = new RegExp(`\\b${code}\\b`, 'gi')
  const indices = Array.from(availableCourseDatas.matchAll(re))
  if (!indices.length) {
    if (!availableCourseDatas.includes('</tr>')) return []
    console.log(`Subject ${code} not exists`)
    return null
  }
  const firstCodeIndex = indices[0].index
  const lastCodeIndex = indices[indices.length - 1].index
  const firstPart = `${availableCourseDatas.slice(0, firstCodeIndex + code.length)}</td></tr>`
  // console.log(firstPart)
  const lastTrIndex = firstPart.lastIndexOf('<tr')
  const shorten = `${availableCourseDatas.slice(lastTrIndex, lastCodeIndex + code.length)}</td></tr>`
  if (shorten.indexOf('data-rowindex') !== -1) {
    const $ = cheerio.load(shorten)
    const dataRowId = $('.order').attr('data-rowindex')
    const dataCrId = $('.order').attr('data-crdid')
    return [dataCrId, dataRowId]
  }
  return []
}

async function submitSpamming() {
  try {
    while (1) {
      const {body: submitRes} = await postRequest(SUBMIT_URL, '', jar)
      if (submitRes.includes('dang-nhap')) {
        console.log('Logged out')
        break
      }
      const parsedRes = JSON.parse(submitRes || {})
      const message = Object.keys(parsedRes).length ? parsedRes.message : ''
      if (message && message.indexOf('Đăng ký thành công') > -1) {
        console.log(`${getTime()}: ${message} 🙏🙏🙏🙏🙏🙏`)
        break
      }
      console.log(`${USERID} ${getTime()}: ${message}`)
    }
  } catch (error) {
    console.log('Spamming Submit:', error.message || error.code || error)
    return submitSpamming()
  }
}

async function exec() {
  try {
    jar = request.jar()
    const isLoggedIn = await logIn(jar)
    if (isLoggedIn) {
      console.log(`Login Successfully: ${USERID}`)
    } else {
      console.log(`Login falied 🌋`)
      return exec()
    }

    const count = (end - start) / 1000
    console.log(`🧞‍♂️‍------Starting------💃 took ${count}s`)
    console.log(`Remaining Courses: ${_courses.join(', ')}`)
    start = Date.now()
    end = Date.now()
    const {body: registeredCourses} = await postRequest(REGISTERED_COURSES_DATA_URL, '', jar)
    if (typeof registeredCourses !== 'string' || !registeredCourses || !registeredCourses.includes('</tr>')) {
      return exec()
    }
    await postRequest(AVAILABLE_COURSES_DATA_URL_MAJOR, '', jar)
    const remainCourses = _courses.filter((code) => registeredCourses.indexOf(code) === -1)
    _courses = [...remainCourses]
    if (remainCourses.length === 0) {
      console.log('All subject registed!...')
      console.log('Exiting...')
      process.exit(0)
    }
    const {body: availableCourseDatas} = await postRequest(AVAILABLE_COURSES_DATA_URL_ALL, '', jar)
    for (const code of remainCourses) {
      const courseIDs = getCourseID(availableCourseDatas, code)
      if (courseIDs && courseIDs.length) {
        await CheckNChoose(courseIDs, jar)
      }
      if (courseIDs === null || !courseIDs.length) {
        // console.log(`Code ${code} not found!`)
        // _courses.splice(_courses.indexOf(code), 1)
      }
    }
    await submitSpamming()
    end = Date.now()
    return exec()
  } catch (error) {
    console.log('Main Func:', (error || {}).message || error)
    return exec()
  }
}

exec()
