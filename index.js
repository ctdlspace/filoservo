import config from './config'
import restify from 'restify'
import fs from 'fs'
import path from 'path'
import mime from 'mime'
import { v4 } from 'uuid'

const server = restify.createServer({
	name: config.name,
})

server.use(restify.plugins.bodyParser({
	mapParams: false,
}))

server.use(restify.plugins.queryParser())

server.get('/view/:name', function(request, response) {
	const name = request.params.name
	const [nameWithoutExt] = name.split('.')
	const filePath = path.join(
		config.dir,
		request.headers.host,
		'files',
		name,
	)
	const fileMetaPath = path.join(
		config.dir,
		request.headers.host,
		'files',
		`${nameWithoutExt}.json`,
	)
	if (!fs.existsSync(filePath)) {
		response.send(
			404,
			{ message: `file "${name}" not found on "${request.headers.host}"` },
		)
		return
	}
	const stat = fs.statSync(filePath)
	const meta = JSON.parse(fs.readFileSync(fileMetaPath, 'utf8'))
	response.writeHead(200, {
		'Content-Type': meta.mime,
		'Content-Length': stat.size,
	})
	const readStream = fs.createReadStream(filePath)
	readStream.pipe(response)
})

server.get('/download/:name', function(request, response) {
	const name = request.params.name
	const [nameWithoutExt] = name.split('.')
	const filePath = path.join(
		config.dir,
		request.headers.host,
		'files',
		name,
	)
	const fileMetaPath = path.join(
		config.dir,
		request.headers.host,
		'files',
		`${nameWithoutExt}.json`,
	)
	if (!fs.existsSync(filePath)) {
		response.send(
			404,
			{ message: `file "${name}" not found on "${request.headers.host}"` },
		)
		return
	}
	const stat = fs.statSync(filePath)
	const meta = JSON.parse(fs.readFileSync(fileMetaPath, 'utf8'))
	console.log(`attachment; filename="${meta.originalName}"'`)
	response.writeHead(200, {
		'Content-Type': meta.mime,
		'Content-Length': stat.size,
		'Content-Disposition': `attachment; filename="${meta.originalName}"`
	})
	const readStream = fs.createReadStream(filePath)
	readStream.pipe(response)
})

server.post('/upload', (request, response) => {
	const host = request.headers.host
	const dir = `${config.dir}/${host}`
	const files = []

	console.debug('/upload', host, dir)

	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir)
		fs.mkdirSync(`${dir}/files`)
		fs.writeFileSync(`${dir}/settings.json`, '{}')
	}

	for (let key in request.files) {
		if (request.files.hasOwnProperty(key)) {
			const mimeType = mime.getType(request.files[key].name)
			const ext = mime.getExtension(mimeType)
			const name = v4()
			const nameWithExt = `${name}.${ext}`
			const nameWithOriginalName = `${nameWithExt}?${request.files[key].name}`
			if (!mimeType) {
				continue
			}
			const meta = {
				originalName: request.files[key].name,
				name: nameWithExt,
				nameWithOriginalName: nameWithOriginalName,
				mime: mimeType,
				ext: ext,
			}
			fs.renameSync(request.files[key].path, `${dir}/files/${nameWithExt}`)
			fs.writeFileSync(`${dir}/files/${name}.json`, JSON.stringify(meta))
			files.push(meta)
		}
	}
	response.header('Access-Control-Allow-Origin', '*')
	response.header('Access-Control-Allow-Headers', 'X-Requested-With')
	response.send(202, { message: 'files uploaded', files })
})

server.get('/*', restify.plugins.serveStatic({
	directory: './static',
	file: 'index.html',
}))

server.listen(config.port, function() {
	console.log({ config })
	console.log('%s listening at %s', server.name, server.url)
})