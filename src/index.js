const path = require('path')
const Converter = require('xl-json')
const dateFns = require('date-fns')

const input = document.getElementById('upload')

const excelTimestampToDate = (serial) => {

  const utc_days = Math.floor(serial - 25569)
  const utc_value = utc_days * 86400
  const date_info = dateFns.addHours(dateFns.fromUnixTime(utc_value), 4)
  
  const fractional_day = serial - Math.floor(serial) + 0.0000001

  let total_seconds = Math.floor(86400 * fractional_day)

  const seconds = total_seconds % 60

  total_seconds -= seconds

  const hours = Math.floor(total_seconds / (60 * 60))
  const minutes = Math.floor(total_seconds / 60) % 60

  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds)
}
const getAllWorkedDays = (rows) => {
  const allLinesAsArray = rows.map(row => Object.values(row))

  const allWeekDays = allLinesAsArray.filter(row => {
    return typeof row[0] == 'number'
  })

  const workedDays = allWeekDays.filter(row => {
    return row[3] !== ''
  })

  return {
    workedDays,
    workedDaysQuantity: workedDays.length
  }
}

const convertToDate = (hour) => {
  return new Date(`January 01, 2000 ${hour}:00`)
}

const cleanData = (day) => {
  const insAndOuts = day.slice(2, 10)
  const punchedTimes = insAndOuts.filter(punched => {
    if (punched) return punched
  })
  
  if (punchedTimes.length % 2) throw new Error('Marcação ímpar não é permitida!')

  return punchedTimes.map(punched => {
    return convertToDate(punched)
  })
}

const prepareDateToCalc = convertedPunched => {
  return convertedPunched.reduce(function (result, value, index, array) {
    if (index % 2 === 0)
      result.push(array.slice(index, index + 2))
    return result
  }, [])
}

const timeConvert = (n) => {
  const num = n;
  const hours = (num / 60);
  const rhours = Math.floor(hours);
  const minutes = (hours - rhours) * 60;
  const rminutes = Math.round(minutes);
  return `${rhours}h e ${rminutes}min`
}
const calculateHours = (day) => {
  const convertedPunched = cleanData(day)
  const chuncks = prepareDateToCalc(convertedPunched)

  let workedHours = 0
  chuncks.map(
    (chunck) => {
      workedHours += (dateFns.differenceInSeconds(chunck[1], chunck[0])) / 60
    })

  
  const convertedDate = dateFns.format(excelTimestampToDate(day[0]), 'dd/MM/yyyy - ccc')

  return {
    workedHours: timeConvert(workedHours),
    compensatoryTime: timeConvert(workedHours - 480),
    convertedDate
  }
}

const getWorkedHours = (workedDays) => {
  return workedDays.map(day => {
    const { workedHours, compensatoryTime, convertedDate } = calculateHours(day)
    return {
      date: convertedDate,
      workedHours,
      compensatoryTime
    }
  })
}

input.addEventListener('change', async () => {
  const options = {
    input: path.resolve(input.files[0].path),
    output: './',
  }

  const results = new Converter(options)

  try {
    const { workedDays } = getAllWorkedDays(results.data.Report)
    const response  = getWorkedHours(workedDays) 
    response.forEach(workedDay => {
      const markup = `
      <tr>
        <td>${workedDay.date}</td>
        <td>${workedDay.workedHours}</td>
        <td>${workedDay.compensatoryTime}</td>
      <tr>
  `
  document.getElementById("data_list").innerHTML += markup;

  })
  } catch (error) {
    document.getElementById("error").innerHTML += error
    throw error
  }
})
