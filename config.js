const {
	FILOSERVO_NAME: name = 'filoservo',
	FILOSERVO_PORT: port = 3000,
	FILOSERVO_DIR: dir = './.data',
} = process.env

export default { port, dir, name }