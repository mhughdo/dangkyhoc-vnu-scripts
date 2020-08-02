require('dotenv').config({path: '.env'})

const HOST = 'http://dangkyhoc.vnu.edu.vn'
const LOGIN_URL = `${HOST}/dang-nhap`
const AVAILABLE_COURSES_DATA_URL_MAJOR = `${HOST}/danh-sach-mon-hoc/1/1`
const AVAILABLE_COURSES_DATA_URL_ALL = `${HOST}/danh-sach-mon-hoc/1/2`
const REGISTERED_COURSES_DATA_URL = `${HOST}/danh-sach-mon-hoc-da-dang-ky/1`
const CHOOSE_COURSE_URL = `${HOST}/chon-mon-hoc/%s/1/1`
const SUBMIT_URL = `${HOST}/xac-nhan-dang-ky/1`
const cheerio = require('cheerio')
const request = require('request')
const getRequest = require('./request/getRequest')
const postRequest = require('./request/postRequest')
const {getTime} = require('./utils')

const ROWIDX = ''
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
    if (response.statusCode === 500) {
      console.error('Internal Server Error')
    }
    return false
  } catch (error) {
    console.error('Login Fn:', (error || {}).message || error)
  }
}

async function CheckNChoose(code) {
  try {
    console.log(`Getting : ${code} 🏇`)

    await postRequest(CHOOSE_COURSE_URL.replace('%s', ROWIDX), '', jar)
    const {body: submitRes} = await postRequest(SUBMIT_URL, '', jar)
    const parsedRes = !submitRes.includes('dang-nhap') && JSON.parse(submitRes)
    const {message} = parsedRes || {}
    if (!message) {
      console.log('Failed to submit')
      return
    }
    if (message.indexOf('Đăng ký thành công') > -1) {
      console.log(`${getTime()}: ${message} 👋`)
    } else {
      console.log(`${getTime()}: ${message}`)
    }
    return
  } catch (error) {
    console.error('CheckNChoose:', error.message || error.code || error)
  }
}

async function exec() {
  try {
    const count = (end - start) / 1000
    console.log(`🧞‍♂️------Starting------💃 took ${count}s`)
    jar = request.jar()
    const isLoggedIn = await logIn(jar)
    if (isLoggedIn) {
      console.log(`Login Successfully: ${USERID}`)
    } else {
      console.log(`Login falied  💩 `)
      start = Date.now()
      end = Date.now()
      return exec()
    }

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
    await postRequest(AVAILABLE_COURSES_DATA_URL_ALL, '', jar)
    const promises = []
    remainCourses.forEach((code) => {
      promises.push(CheckNChoose(code))
    })
    await Promise.all(promises)
    end = Date.now()
    return exec()
  } catch (error) {
    console.error('Main Fn:', error)
    return exec()
  }
}

exec()
