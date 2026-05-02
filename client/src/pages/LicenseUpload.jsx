import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { useAppContext } from '../context/AppContext'

const LicenseUpload = () => {
  const { axios, user, fetchUser, navigate } = useAppContext()
  const [license, setLicense] = useState(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)

  const onFileChange = (event) => {
    const file = event.target.files?.[0]
    setLicense(file || null)
    setPreview(file ? URL.createObjectURL(file) : '')
  }

  const uploadLicense = async (event) => {
    event.preventDefault()
    if (!user) {
      toast.error('Login before uploading your driver license')
      return
    }
    if (!license) {
      toast.error('Choose a driver license image')
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('license', license)
      const { data } = await axios.post('/api/user/driver-license', formData)
      if (data.success) {
        toast.success(data.message)
        await fetchUser()
        navigate(-1)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className='px-6 md:px-16 lg:px-24 xl:px-32 py-16'>
      <div className='mx-auto max-w-3xl rounded-3xl border border-borderColor bg-white p-8 shadow-lg'>
        <p className='text-sm font-semibold uppercase tracking-[0.25em] text-primary'>Identity verification</p>
        <h1 className='mt-3 text-4xl font-semibold text-gray-950'>Upload driver license</h1>
        <p className='mt-3 text-gray-500'>Your license is required before checkout so owners can verify bookings safely.</p>

        <form onSubmit={uploadLicense} className='mt-8 space-y-5'>
          <label htmlFor='license-file' className='flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-borderColor bg-light p-6 text-center'>
            {preview ? (
              <img src={preview} alt='Driver license preview' className='max-h-72 rounded-2xl object-contain' />
            ) : (
              <>
                <span className='text-lg font-semibold text-gray-900'>Choose license image</span>
                <span className='mt-2 text-sm text-gray-500'>PNG, JPG, or WEBP</span>
              </>
            )}
          </label>
          <input id='license-file' type='file' accept='image/*' onChange={onFileChange} className='sr-only' />
          <div className='flex flex-wrap gap-3'>
            <button className='rounded-full bg-primary px-6 py-3 font-medium text-white hover:bg-primary-dull'>
              {loading ? 'Uploading...' : 'Upload license'}
            </button>
            <button type='button' onClick={() => navigate(-1)} className='rounded-full border border-borderColor px-6 py-3 font-medium text-gray-700'>
              Back
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

export default LicenseUpload
