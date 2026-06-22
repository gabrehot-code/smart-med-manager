const token = localStorage.getItem('token')

const res = await fetch('/api/patients', {
  headers: {
    Authorization: `Bearer ${token}`

  }
})