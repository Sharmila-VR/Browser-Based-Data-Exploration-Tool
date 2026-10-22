import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { clearToast } from '../state/uiSlice.js'

export default function Toast() {
  const dispatch = useDispatch()
  const message = useSelector(state => state.ui.toastMessage)

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        dispatch(clearToast())
      }, 3500)
      return () => clearTimeout(timer)
    }
  }, [message, dispatch])

  if (!message) return null

  return (
    <div className="toast-notification" role="status">
      <CheckCircleIcon fontSize="small" />
      <span>{message}</span>
    </div>
  )
}
