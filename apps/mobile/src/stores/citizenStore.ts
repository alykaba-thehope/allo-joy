import { create } from 'zustand'
import { saveCitizen, clearCitizen, getCitizen } from '../lib/db'

type CitizenState = {
  id: string | null
  telephone: string | null
  prenom: string | null
  nomFamille: string | null
  accessToken: string | null
  isAuthenticated: boolean
}

type CitizenActions = {
  setAuth: (params: {
    id: string
    telephone: string
    prenom: string | null
    nomFamille: string | null
    accessToken: string
    refreshToken: string
    expiresIn: number
  }) => void
  loadFromDb: () => void
  logout: () => void
}

export const useCitizenStore = create<CitizenState & CitizenActions>((set) => ({
  id: null,
  telephone: null,
  prenom: null,
  nomFamille: null,
  accessToken: null,
  isAuthenticated: false,

  setAuth: ({ id, telephone, prenom, nomFamille, accessToken, refreshToken, expiresIn }) => {
    saveCitizen({
      id,
      telephone,
      prenom,
      nom_famille: nomFamille,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires: Date.now() + expiresIn * 1000,
    })
    set({ id, telephone, prenom, nomFamille, accessToken, isAuthenticated: true })
  },

  loadFromDb: () => {
    const citizen = getCitizen()
    if (citizen?.access_token) {
      set({
        id: citizen.id,
        telephone: citizen.telephone,
        prenom: citizen.prenom,
        nomFamille: citizen.nom_famille,
        accessToken: citizen.access_token,
        isAuthenticated: true,
      })
    }
  },

  logout: () => {
    clearCitizen()
    set({ id: null, telephone: null, prenom: null, nomFamille: null, accessToken: null, isAuthenticated: false })
  },
}))
