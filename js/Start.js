let canvas = document.querySelector("#meu-canvas"),
  contexto = canvas.getContext("2d")
imagens = {
  espaco: 'img/fundo-espaco.png',
  estrelas: 'img/fundo-estrelas.png',
  nuvens: 'img/fundo-nuvens.png',
  nave: 'img/nave-spritesheet.png',
  ovni: 'img/ovni.png',
  explosao: 'img/explosao.png',
}

let musicaAcao,
  imagensCarregadas = 0,
  totalImagens = 0,
  animacao,
  teclado,
  fundoEspaco,
  fundoNuvens,
  fundoEstrelas,
  nave,
  colisor,
  criadorInimigos,
  painel

function carregarImagens() {
  for (let i in imagens) {
    let img = new Image()
    img.src = imagens[i]
    img.onload = carregando
    totalImagens++
    imagens[i] = img
  }
}

function carregarMusicas() {
  musicaAcao = new Audio()
  musicaAcao.src = 'snd/musica-acao.mp3'
  musicaAcao.load()
  musicaAcao.volume = 0.2
  musicaAcao.loop = true
}

function carregando() {
  const ready = imagensCarregadas + 1 == totalImagens;
  
  contexto.save()
  // Fundo
  contexto.drawImage(imagens.espaco, 0, 0, canvas.width, canvas.height)

  // Texto "Carregando"
  contexto.fillStyle = 'white'
  contexto.font = '50px sans-serif'

  if (ready) {
    contexto.fillText('Ready', 180, 200)
  } else {
    contexto.fillText('Loading...', 150, 200)
  }

  imagensCarregadas++

  // Barra de Loading
  let tamanhoTotal = 300
  let tamanhoBarra = imagensCarregadas / totalImagens * tamanhoTotal
  contexto.fillStyle = 'yellow'
  contexto.fillRect(100, 250, tamanhoBarra, 50)

  contexto.restore()

  if (ready) {
    iniciarObjetos()
    mostrarLinkJogar()
  }
}

function iniciarObjetos() {
  animacao = new Animacao(contexto)
  teclado = new Teclado(document)
  colisor = new Colisor()

  fundoEspaco = new Fundo(contexto, imagens.espaco)
  fundoEstrelas = new Fundo(contexto, imagens.estrelas)
  fundoNuvens = new Fundo(contexto, imagens.nuvens)
  nave = new Nave(contexto, teclado, imagens.nave, imagens.explosao)
  painel = new Painel(contexto, nave)

  animacao.novoSprite(fundoEspaco)
  animacao.novoSprite(fundoEstrelas)
  animacao.novoSprite(fundoNuvens)

  animacao.novoSprite(painel)
  animacao.novoSprite(nave)


  colisor.novoSprite(nave)
  animacao.novoProcessamento(colisor)

  configuracoesIniciais()
}

function configuracoesIniciais() {
  // Fundos
  fundoEspaco.velocidade = 60
  fundoNuvens.velocidade = 150
  fundoEstrelas.velocidade = 500

  // Nave
  nave.posicionar()
  nave.velocidade = 200

  // Game Over
  nave.acabaramVidas = function () {
    animacao.desligar()
    gameOver()
  }

  // Pontuação
  colisor.aoColidir = function (obj1, obj2) {
    if ((obj1 instanceof Tiro && obj2 instanceof Ovni) ||
      (obj1 instanceof Ovni && obj2 instanceof Tiro))
      painel.pontuacao += 10
  }

  // Inimigos
  gerarInimigos()
}

function gerarInimigos() {
  criadorInimigos = {
    ultimoOvni: new Date().getTime(),
    processar: function () {
      let agora = new Date().getTime()
      decorrido = agora - this.ultimoOvni

      if (decorrido > 1000) {
        novoOvni()
        this.ultimoOvni = agora
      }
    }
  }
  animacao.novoProcessamento(criadorInimigos)
}

function pausarJogo() {
  // Pausa
  if (animacao.ligado) {
    animacao.desligar()
    ativarTiro(false)
    musicaAcao.pause()

    // Escrever "Pause"
    contexto.save()
    contexto.fillStyle = 'white'
    contexto.font = '50px sans-serif'
    contexto.fillText("Pause", 180, 200)
    contexto.restore()
  }
  else {
    // Impede que um inimigo seja gerado logo após 'despausar'
    criadorInimigos.ultimoOvni = new Date()

    ativarTiro(true)
    animacao.ligar()
    musicaAcao.play()
  }
}

function ativarTiro(ativar) {
  if (ativar) {
    teclado.disparou(ESPACO, function () {
      nave.atirar()
    })
  }
  else {
    teclado.disparou(ESPACO, null)
  }
}

function novoOvni() {
  let imgOvni = imagens.ovni
  let ovni = new Ovni(imgOvni, contexto, imagens.explosao)
  // Mínimo: 5 máximo: 20
  ovni.velocidade = Math.floor(500 + Math.random() * (20 - 5 + 1))
  // Mínimo: 0
  // máximo: largura do canvas - largura do ovni
  ovni.x = Math.floor(Math.random() * (canvas.width - imgOvni.width + 1))
  // Descontar a altura
  ovni.y = -imgOvni.height
  animacao.novoSprite(ovni)
  colisor.novoSprite(ovni)
}

function mostrarLinkJogar() {
  document.querySelector('#botao-start').style.display = "block"
}

function esconderLinkJogar() {
  document.querySelector('#botao-start').style.display = "none"
}

function startGame() {

  criadorInimigos.ultimoOvni = new Date().getTime()

  esconderLinkJogar()

  musicaAcao.play()
  animacao.ligar()

  ativarTiro(true)

  painel.pontuacao = 0
  teclado.disparou(ENTER, pausarJogo)

  teclado.disparou(SHIFT, function () {
    teclado.disparou(IGUAL, function () {
      nave.vidas++
    })
    teclado.disparou(MENOS, function () {
      if (nave.vidas > 0)
        nave.vidas--
    })
  })
}

function gameOver() {
  // Tiro
  ativarTiro(false)

  // Pausa
  teclado.disparou(ENTER, null)
  musicaAcao.pause()
  musicaAcao.currentTime = 0.0

  // Remove os inimigos
  removerInimigos().then(() => {
    // Fundo
    contexto.drawImage(imagens.espaco, 0, 0, canvas.width, canvas.height)

    // Texto "You Died"
    contexto.save()
    contexto.fillStyle = 'white'
    contexto.font = '70px sans-serif'
    contexto.fillText('You Died', 110, 200)
    contexto.restore()

    // botão "Start"
    mostrarLinkJogar()
  })

  nave.vidas = 3
  nave.posicionar
  animacao.novoSprite(nave)
  colisor.novoSprite(nave)
}

function removerInimigos() {
  return new Promise((resolve, reject) => {
    for (let i in animacao.sprites) {
      if (animacao.sprites[i] instanceof Ovni)
        animacao.excluirSprite(animacao.sprites[i])
      if (i == animacao.sprites.length - 1) resolve()
    }
  })
}

function iniciar() {
  carregarMusicas()
  carregarImagens()
}
