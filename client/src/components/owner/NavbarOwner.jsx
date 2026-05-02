import React from 'react'
import { Link } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

const NavbarOwner = () => {

    const {user} = useAppContext()

  return (
    <div className='flex items-center justify-between px-6 md:px-10 py-4 text-gray-500 border-b border-borderColor relative transition-all'>
      <Link to='/'>
        <span className="flex items-center gap-3 text-xl font-bold text-gray-950"><span className="rounded-2xl bg-primary px-3 py-2 text-white">IR</span> IntelliRent</span>
      </Link>
      <p>Welcome, {user?.name || "Owner"}</p>
    </div>
  )
}

export default NavbarOwner
