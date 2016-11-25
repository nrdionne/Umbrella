'use strict'

const getCurrentWeather = require('./lib/getCurrentWeather')

const firstOfEntityRole = function(message, entity, role) {
  role = role || 'generic';

  const slots = message.slots
  const entityValues = message.slots[entity]
  const valsForRole = entityValues ? entityValues.values_by_role[role] : null

  return valsForRole ? valsForRole[0] : null
}

exports.handle = (client) => {
  // Create steps
  const sayHello = client.createStep({
    satisfied() {
      return Boolean(client.getConversationState().helloSent)
    },

    prompt() {
      client.addResponse('welcome')
      client.addResponse('provide/documentation', {
        documentation_link: 'http://docs.init.ai',
      })
      client.addResponse('provide/instructions')

      client.updateConversationState({
        helloSent: true
      })

      client.done()
    }
  })


  const collectCity = client.createStep({
  satisfied() {
    return Boolean(client.getConversationState().weatherCity)
  },

  extractInfo() {
    const city = firstOfEntityRole(client.getMessagePart(), 'city')

    if (city) {
      client.updateConversationState({
        weatherCity: city,
      })

      console.log('User wants the weather in:', city.value)
    }
  },

  prompt() {
    client.addResponse('app:response:name:prompt/weather_city')
    client.done()
  },
})

const provideWeather = client.createStep({
satisfied() {
  return false
},

prompt(callback) {
  getCurrentWeather(client.getConversationState().weatherCity.value, resultBody => {
    if (!resultBody || resultBody.cod !== 200) {
      console.log('Error getting weather.')
      callback()
      return
    }

    const weatherDescription = (
      resultBody.weather.length > 0 ?
      resultBody.weather[0].description :
      null
    )

    const weatherData = {
      temperature: resultBody.main.temp,
      condition: weatherDescription,
      city: resultBody.name,
    }

    console.log('sending real weather:', weatherData)
    client.addResponse('app:response:name:provide_weather/current', weatherData)
    client.done()

    callback()
  })
}
})

  const untrained = client.createStep({
    satisfied() {
      return false
    },

    prompt() {
      client.addResponse('apology/untrained')
      client.done()
    }
  })

  client.runFlow({
    classifications: {
      // map inbound message classifications to names of streams
    },
    autoResponses: {
      // configure responses to be automatically sent as predicted by the machine learning model
    },
    streams: {
      main: 'getWeather',
      hi: [sayHello],
      getWeather: [collectCity, provideWeather],
    },
  })
}
