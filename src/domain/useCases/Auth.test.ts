import IAuthRepository, { ICreateUserData } from '@domain/repositories/IAuthRepository'
import Auth from './Auth'
import AuthRepositoryMock from '@domain/repositories/__mocks__/AuthRepositoryMock'
import * as hashUtils from '@utils/hash'

describe('Auth', () => {
	let auth: Auth
	let mockRepository: IAuthRepository

	beforeEach(() => {
		mockRepository = new AuthRepositoryMock()
		auth = new Auth(mockRepository)
	})

	test('register - successful registration', async () => {
		const mockedId = 'mockedUserId'
		mockRepository.createUser = async () => {
			return mockedId
		}

		mockRepository.verifyEmailAlreadyUsed = async () => {
			return false
		}

		const registerInput = {
			email: 'newuser@example.com',
			password: 'password123',
			username: 'newuser',
		}

		const user = await auth.register(registerInput)

		expect(user.id).toBe(mockedId)
	})

	test('register - email already used', async () => {
		mockRepository.verifyEmailAlreadyUsed = async () => {
			return true
		}

		const registerInput = {
			email: 'test@example.com',
			password: 'password123',
			username: 'newuser',
		}

		await expect(auth.register(registerInput)).rejects.toEqual(
			'Your registration was not possible. Try again later.',
		)
	})

	test('login - successful login', async () => {
		const password = 'P4$$word!'
		const mockedUser = {
			id: 'mockedId',
			email: 'mocked@gmail.com',
			hashPassword: await hashUtils.generateHash(password),
			username: 'mocked',
		}

		mockRepository.getUserByEmail = async () => {
			return mockedUser
		}

		const loginInput = {
			email: mockedUser.email,
			password,
		}

		const user = await auth.login(loginInput)

		expect(user).toEqual({ id: mockedUser.id, email: mockedUser.email, username: mockedUser.username })
	})

	test('login - email not exists', async () => {
		mockRepository.getUserByEmail = async () => {
			return undefined
		}

		const loginInput = {
			email: 'nonexistent@example.com',
			password: 'password',
		}

		await expect(auth.login(loginInput)).rejects.toEqual('Email or password incorrect')
	})

	test('login - invalid password', async () => {
		const mockedUser = {
			id: 'mockedId',
			email: 'mocked@gmail.com',
			hashPassword: await hashUtils.generateHash('P4$$word!'),
			username: 'mocked',
		}

		mockRepository.getUserByEmail = async () => {
			return mockedUser
		}

		const loginInput = {
			email: mockedUser.email,
			password: 'wrong_password',
		}

		await expect(auth.login(loginInput)).rejects.toEqual('Email or password incorrect')
	})

	test('generateAuthCode - get auth code', async () => {
		const mockedCode = 'generate_code'
		mockRepository.generateAuthCode = async () => {
			return mockedCode
		}
		mockRepository.saveAuthCode = async () => {}

		const userInput = {
			id: 'mockedId',
			email: 'mocked@gmail.com',
			username: 'mocked',
		}

		const code = await auth.generateAuthCode(userInput)

		expect(code).toEqual(mockedCode)
	})

	test('validateAuthCode - validate auth code', async () => {
		const mockedUser = {
			id: 'mockedId',
			email: 'mocked@gmail.com',
			username: 'mocked',
		}

		mockRepository.validateAuthCode = async () => {
			return true
		}
		mockRepository.decodeAuthCode = async () => {
			return mockedUser
		}

		const userInfos = await auth.validateAuthCode('valid_code')

		expect(userInfos.id).toEqual(mockedUser.id)
	})

	test('validateAuthCode - invalid auth code', async () => {
		mockRepository.validateAuthCode = async () => {
			return false
		}

		await expect(auth.validateAuthCode('invalid_code')).rejects.toEqual('Forbidden')
	})

	test('renewAuthCode - renew with success', async () => {
		const mockedUser = {
			id: 'mockedId',
			email: 'mocked@gmail.com',
			username: 'mocked',
		}

		mockRepository.validateAuthCode = async () => {
			return true
		}
		mockRepository.decodeAuthCode = async () => {
			return mockedUser
		}
		mockRepository.getUserById = async () => {
			return mockedUser
		}
		mockRepository.saveAuthCode = async () => {}
		const newMockedCode = 'new_code'
		mockRepository.generateAuthCode = async () => {
			return newMockedCode
		}

		const newCode = await auth.renewAuthCode('valid_code')
		expect(newCode).toEqual(newMockedCode)
	})

	test('renewAuthCode - renew with user deleted', async () => {
		const mockedUser = {
			id: 'mockedId',
			email: 'mocked@gmail.com',
			username: 'mocked',
		}

		mockRepository.validateAuthCode = async () => {
			return true
		}
		mockRepository.decodeAuthCode = async () => {
			return mockedUser
		}
		mockRepository.getUserById = async () => {
			return undefined
		}

		await expect(auth.renewAuthCode('valid_code')).rejects.toEqual('User not found')
	})
})
