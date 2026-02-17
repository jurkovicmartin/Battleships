document.addEventListener('DOMContentLoaded', () => {
  const userGrid = document.querySelector('.grid-user')
  const computerGrid = document.querySelector('.grid-computer')
  const displayGrid = document.querySelector('.grid-display')
  const ships = document.querySelectorAll('.ship')
  const startButton = document.querySelector('#start')
  const rotateButton = document.querySelector('#rotate')
  const resetButton = document.querySelector('#reset')
  const turnDisplay = document.querySelector('#whose-go')
  const infoDisplay = document.querySelector('#info')
  const setupButtons = document.getElementById('setup-buttons')
  const menuButton = document.getElementById('menu')
  const userSquares = []
  const computerSquares = []
  let isHorizontal = true
  let isGameOver = false
  let currentPlayer = 'user'
  const width = 10
  let playerNum = 0
  let ready = false
  let enemyReady = false
  let allShipsPlaced = false
  let shotFired = -1
  // Computer AI (single player)
  let aiTargetList = [];
  let aiFirstHit = null;
  //Ships
  const shipArray = [
    {
      name: 'destroyer',
      directions: [
        [0, 1],
        [0, width]
      ]
    },
    {
      name: 'submarine',
      directions: [
        [0, 1, 2],
        [0, width, width*2]
      ]
    },
    {
      name: 'cruiser',
      directions: [
        [0, 1, 2],
        [0, width, width*2]
      ]
    },
    {
      name: 'battleship',
      directions: [
        [0, 1, 2, 3],
        [0, width, width*2, width*3]
      ]
    },
    {
      name: 'carrier',
      directions: [
        [0, 1, 2, 3, 4],
        [0, width, width*2, width*3, width*4]
      ]
    },
  ]

  createBoard(userGrid, userSquares)
  createBoard(computerGrid, computerSquares)

  // Select Player Mode
  if (gameMode === 'singlePlayer') {
    startSinglePlayer()
  } else {
    startMultiPlayer()
  }

  // Multiplayer
  function startMultiPlayer() {
    const socket = io();

    // Get your player number
    socket.on('player-number', num => {
      if (num === -1) {
        infoDisplay.innerHTML = "Sorry, the server is full"
      } else {
        playerNum = parseInt(num)
        if(playerNum === 1) currentPlayer = "enemy"

        console.log(playerNum)

        // Get other player status
        socket.emit('check-players')
      }
    })

    // Another player has connected or disconnected
    socket.on('player-connection', num => {
      console.log(`Player number ${num} has connected or disconnected`)
      playerConnectedOrDisconnected(num)
    })

    // On enemy ready
    socket.on('enemy-ready', num => {
      enemyReady = true
      playerReady(num)
      if (ready) {
        playGameMulti(socket)
        setupButtons.style.display = 'none'
      }
    })

    // Check player status
    socket.on('check-players', players => {
      players.forEach((p, i) => {
        if(p.connected) playerConnectedOrDisconnected(i)
        if(p.ready) {
          playerReady(i)
          if(i !== playerReady) enemyReady = true
        }
      })
    })

    // On Timeout
    socket.on('timeout', () => {
      infoDisplay.innerHTML = 'You have reached the 10 minute limit'
    })

    // Ready button click
    startButton.addEventListener('click', () => {
      if(allShipsPlaced) playGameMulti(socket)
      else infoDisplay.innerHTML = "Please place all ships"
    })

    // Setup event listeners for firing
    computerSquares.forEach(square => {
      square.addEventListener('click', () => {
        if(currentPlayer === 'user' && ready && enemyReady) {
          shotFired = square.dataset.id
          socket.emit('fire', shotFired)
        }
      })
    })

    // On Fire Received
    socket.on('fire', id => {
      enemyGo(id)
      const square = userSquares[id]
      socket.emit('fire-reply', square.classList)
      playGameMulti(socket)
    })

    // On Fire Reply Received
    socket.on('fire-reply', classList => {
      revealSquare(classList)
      playGameMulti(socket)
    })

    function playerConnectedOrDisconnected(num) {
      let player = `.p${parseInt(num) + 1}`
      document.querySelector(`${player} .connected`).classList.toggle('active')
      if(parseInt(num) === playerNum) document.querySelector(player).style.fontWeight = 'bold'
    }
  }

  // Single Player
  function startSinglePlayer() {
    generate(shipArray[0])
    generate(shipArray[1])
    generate(shipArray[2])
    generate(shipArray[3])
    generate(shipArray[4])

    startButton.addEventListener('click', () => {
      if (!allShipsPlaced){
        infoDisplay.innerHTML = 'Place your ships'
        return
      }
      infoDisplay.innerHTML = ''
      setupButtons.style.display = 'none'
      playGameSingle()
    })
  }

  //Create Board
  function createBoard(grid, squares) {
    for (let i = 0; i < width*width; i++) {
      const square = document.createElement('div')
      square.dataset.id = i
      grid.appendChild(square)
      squares.push(square)
    }
  }

  //Draw the computers ships in random locations
  function generate(ship) {
    let randomDirection = Math.floor(Math.random() * ship.directions.length)
    let current = ship.directions[randomDirection]
    if (randomDirection === 0) direction = 1
    if (randomDirection === 1) direction = 10
    let randomStart = Math.abs(Math.floor(Math.random() * computerSquares.length - (ship.directions[0].length * direction)))

    const isTaken = current.some(index => computerSquares[randomStart + index].classList.contains('taken'))
    const isAtRightEdge = current.some(index => (randomStart + index) % width === width - 1)
    const isAtLeftEdge = current.some(index => (randomStart + index) % width === 0)

    if (!isTaken && !isAtRightEdge && !isAtLeftEdge) current.forEach(index => computerSquares[randomStart + index].classList.add('taken', ship.name))

    else generate(ship)
  }
  

  //Rotate the ships
  function rotate() {
    // 1. Grab the fresh, newly created elements directly from the DOM
    const currentDestroyer = document.querySelector('.destroyer-container');
    const currentSubmarine = document.querySelector('.submarine-container');
    const currentCruiser = document.querySelector('.cruiser-container');
    const currentBattleship = document.querySelector('.battleship-container');
    const currentCarrier = document.querySelector('.carrier-container');

    // 2. Toggle the vertical classes on the live elements
    // (If the class isn't there, it adds it. If it is there, it removes it.)
    if (currentDestroyer) currentDestroyer.classList.toggle('destroyer-container-vertical');
    if (currentSubmarine) currentSubmarine.classList.toggle('submarine-container-vertical');
    if (currentCruiser) currentCruiser.classList.toggle('cruiser-container-vertical');
    if (currentBattleship) currentBattleship.classList.toggle('battleship-container-vertical');
    if (currentCarrier) currentCarrier.classList.toggle('carrier-container-vertical');

    // 3. Flip the boolean state (if true it becomes false, if false it becomes true)
    isHorizontal = !isHorizontal;
  }
  rotateButton.addEventListener('click', rotate)

  //move around user ship
  ships.forEach(ship => ship.addEventListener('dragstart', dragStart))
  userSquares.forEach(square => square.addEventListener('dragstart', dragStart))
  userSquares.forEach(square => square.addEventListener('dragover', dragOver))
  userSquares.forEach(square => square.addEventListener('dragenter', dragEnter))
  userSquares.forEach(square => square.addEventListener('dragleave', dragLeave))
  userSquares.forEach(square => square.addEventListener('drop', dragDrop))
  userSquares.forEach(square => square.addEventListener('dragend', dragEnd))

  let selectedShipNameWithIndex
  let draggedShip
  let draggedShipLength

  ships.forEach(ship => ship.addEventListener('mousedown', (e) => {
    selectedShipNameWithIndex = e.target.id
    // console.log(selectedShipNameWithIndex)
  }))

  function dragStart() {
    draggedShip = this
    draggedShipLength = this.childNodes.length
    // console.log(draggedShip)
  }

  function dragOver(e) {
    e.preventDefault()
  }

  function dragEnter(e) {
    e.preventDefault()
  }

  function dragLeave() {
    // console.log('drag leave')
  }

function dragDrop() {
  let shipNameWithLastId = draggedShip.lastChild.id
  let shipClass = shipNameWithLastId.slice(0, -2)
  let lastShipIndex = parseInt(shipNameWithLastId.substr(-1))
  let shipLastId = lastShipIndex + parseInt(this.dataset.id)
  
  const notAllowedHorizontal = [0,10,20,30,40,50,60,70,80,90,1,11,21,31,41,51,61,71,81,91,2,22,32,42,52,62,72,82,92,3,13,23,33,43,53,63,73,83,93]
  const notAllowedVertical = [99,98,97,96,95,94,93,92,91,90,89,88,87,86,85,84,83,82,81,80,79,78,77,76,75,74,73,72,71,70,69,68,67,66,65,64,63,62,61,60]
  
  let newNotAllowedHorizontal = notAllowedHorizontal.splice(0, 10 * lastShipIndex)
  let newNotAllowedVertical = notAllowedVertical.splice(0, 10 * lastShipIndex)

  selectedShipIndex = parseInt(selectedShipNameWithIndex.substr(-1))
  shipLastId = shipLastId - selectedShipIndex
  
  // Calculate the starting index for the ship based on where it was dropped
  let startIndex = parseInt(this.dataset.id) - selectedShipIndex;

  // HORIZONTAL PLACEMENT
  if (isHorizontal && !newNotAllowedHorizontal.includes(shipLastId)) {
    // Check for overlap before proceeding
    if (!isPlacementValid(startIndex, true, draggedShipLength, width, userSquares)) return;

    for (let i=0; i < draggedShipLength; i++) {
      let directionClass
      if (i === 0) directionClass = 'start'
      if (i === draggedShipLength - 1) directionClass = 'end'
      userSquares[startIndex + i].classList.add('taken', 'horizontal', directionClass, shipClass)
    }
    
  // VERTICAL PLACEMENT
  } else if (!isHorizontal && !newNotAllowedVertical.includes(shipLastId)) {
    // Check for overlap before proceeding
    if (!isPlacementValid(startIndex, false, draggedShipLength, width, userSquares)) return;

    for (let i=0; i < draggedShipLength; i++) {
      let directionClass
      if (i === 0) directionClass = 'start'
      if (i === draggedShipLength - 1) directionClass = 'end'
      userSquares[startIndex + width*i].classList.add('taken', 'vertical', directionClass, shipClass)
    }
  } else {
    return // Rebound if it hit a boundary
  }

    // Only run this if the ship was successfully placed
    displayGrid.removeChild(draggedShip)
    if(!displayGrid.querySelector('.ship')) allShipsPlaced = true
}

function isPlacementValid(startIndex, isHorizontal, length, width, gridSquares) {
  for (let i = 0; i < length; i++) {
    // Calculate the exact index for each piece of the ship
    let indexToCheck = isHorizontal ? startIndex + i : startIndex + (width * i);
    
    // If the square is undefined or already taken, the placement is invalid
    if (!gridSquares[indexToCheck] || gridSquares[indexToCheck].classList.contains('taken')) {
      return false; 
    }
  }
  return true; // All squares are clear!
}

function resetBoard() {
  // Remove every class that was added during the dragDrop process.
  const classesToRemove = [
    'taken', 'horizontal', 'vertical', 'start', 'end', 
    'destroyer', 'submarine', 'cruiser', 'battleship', 'carrier'
  ];
  
  userSquares.forEach(square => {
    square.classList.remove(...classesToRemove);
  });

  // Because the previous ships were deleted from the DOM, we need to rebuild them.
  displayGrid.innerHTML = `
    <div class="ship destroyer-container" draggable="true"><div id="destroyer-0"></div><div id="destroyer-1"></div></div>
    <div class="ship submarine-container" draggable="true"><div id="submarine-0"></div><div id="submarine-1"></div><div id="submarine-2"></div></div>
    <div class="ship cruiser-container" draggable="true"><div id="cruiser-0"></div><div id="cruiser-1"></div><div id="cruiser-2"></div></div>
    <div class="ship battleship-container" draggable="true"><div id="battleship-0"></div><div id="battleship-1"></div><div id="battleship-2"></div><div id="battleship-3"></div></div>
    <div class="ship carrier-container" draggable="true"><div id="carrier-0"></div><div id="carrier-1"></div><div id="carrier-2"></div><div id="carrier-3"></div><div id="carrier-4"></div></div>
  `;

  allShipsPlaced = false;

  // Because we just created brand new HTML elements for the ships, 
  // they won't have the drag event listeners attached to them anymore.
  rebindDragEvents(); 

  // Clear any info statement
  infoDisplay.innerHTML = ''
}
resetButton.addEventListener('click', resetBoard)


function rebindDragEvents() {
  // Grab the newly created ships from the display grid
  const ships = document.querySelectorAll('.ship')

  // Re-attach the dragstart event
  ships.forEach(ship => ship.addEventListener('dragstart', dragStart))

  // Re-attach the mousedown event to track the specific index
  ships.forEach(ship => ship.addEventListener('mousedown', (e) => {
    selectedShipNameWithIndex = e.target.id
    // console.log(selectedShipNameWithIndex)
  }))
}

  function dragEnd() {
    // console.log('dragend')
  }

  // Game Logic for MultiPlayer
  function playGameMulti(socket) {
    setupButtons.style.display = 'none'
    if(isGameOver) return
    if(!ready) {
      socket.emit('player-ready')
      ready = true
      playerReady(playerNum)
    }

    if(enemyReady) {
      if(currentPlayer === 'user') {
        // Only change to 'Your Go' if they didn't just get a bonus shot
        if (!turnDisplay.innerHTML.includes('Shoot Again')) {
          turnDisplay.innerHTML = 'Your Go'
        }
      }
      if(currentPlayer === 'enemy') {
        turnDisplay.innerHTML = "Enemy's Go"
      }
    }
  }

  function playerReady(num) {
    let player = `.p${parseInt(num) + 1}`
    document.querySelector(`${player} .ready`).classList.toggle('active')
  }

  // Game Logic for Single Player
  function playGameSingle() {
    if (isGameOver) return
    if (currentPlayer === 'user') {
      turnDisplay.innerHTML = 'Your Go'
      computerSquares.forEach(square => square.addEventListener('click', function(e) {
        shotFired = square.dataset.id
        revealSquare(square.classList)
      }))
    }
    if (currentPlayer === 'enemy') {
      turnDisplay.innerHTML = 'Computers Go'
      setTimeout(enemyGo, 1000)
    }
  }

  let destroyerCount = 0
  let submarineCount = 0
  let cruiserCount = 0
  let battleshipCount = 0
  let carrierCount = 0

  function revealSquare(classList) {
    const enemySquare = computerGrid.querySelector(`div[data-id='${shotFired}']`)
    const obj = Object.values(classList)

    // Stop immediately if the square is already played, 
    // or if it isn't the user's turn, or if the game is over.
    if (enemySquare.classList.contains('boom') || 
        enemySquare.classList.contains('miss') || 
        currentPlayer !== 'user' || 
        isGameOver) {
      return; 
    }

    // Add to ship counters
    if (obj.includes('destroyer')) destroyerCount++
    if (obj.includes('submarine')) submarineCount++
    if (obj.includes('cruiser')) cruiserCount++
    if (obj.includes('battleship')) battleshipCount++
    if (obj.includes('carrier')) carrierCount++

    // Bonus shot logic
    if (obj.includes('taken')) {
      enemySquare.classList.add('boom');
      checkForWins();

      turnDisplay.innerHTML = 'Direct Hit! Shoot Again!'; 
      return;
      
    } else {
      enemySquare.classList.add('miss');
      checkForWins();
      
      // Pass turn
      currentPlayer = 'enemy';
      turnDisplay.innerHTML = 'Computers Go';
      if (gameMode === 'singlePlayer') playGameSingle();
    }
  }

  let cpuDestroyerCount = 0
  let cpuSubmarineCount = 0
  let cpuCruiserCount = 0
  let cpuBattleshipCount = 0
  let cpuCarrierCount = 0


  function enemyGo(square) {
    if (isGameOver) return; // Stop the computer if the game is already over!

    if (gameMode === 'singlePlayer') square = selectSquare();
    
    if (!userSquares[square].classList.contains('boom') && !userSquares[square].classList.contains('miss')) {
      
      const hit = userSquares[square].classList.contains('taken');
      
      // Bonus shot logic
      if (hit) {
        userSquares[square].classList.add('boom');

        updateAITargetList(square);
        
        // Update counters
        if (userSquares[square].classList.contains('destroyer')) cpuDestroyerCount++
        if (userSquares[square].classList.contains('submarine')) cpuSubmarineCount++
        if (userSquares[square].classList.contains('cruiser')) cpuCruiserCount++
        if (userSquares[square].classList.contains('battleship')) cpuBattleshipCount++
        if (userSquares[square].classList.contains('carrier')) cpuCarrierCount++
        
        checkForWins();
        
        // Computer gets to shoot again! Let's wait 1 second so it looks natural.
        if (!isGameOver) {
          setTimeout(enemyGo, 1000); 
        }
        
      } else {
        userSquares[square].classList.add('miss');
        checkForWins();
        
        // Computer missed. Pass the turn back to the user.
        currentPlayer = 'user';
        turnDisplay.innerHTML = 'Your Go';
      }

    } else if (gameMode === 'singlePlayer') {
      // It guessed an old square. Try again immediately.
      enemyGo();
    }
  }

  function updateAITargetList(square) {
    if (difficulty == 'easy') return

    if (aiFirstHit === null) {
      aiFirstHit = square;

      // Add the 4 adjacent squares
      if (square % 10 !== 0) aiTargetList.push(square - 1);
      if (square % 10 !== 9) aiTargetList.push(square + 1);
      if (square >= 10) aiTargetList.push(square - 10);
      if (square < 90) aiTargetList.push(square + 10);
    }
    else {
      // STATE 2: WE KNOW THE AXIS! TIME TO SCAN!
      
      // 1. Determine if we are moving horizontally (1) or vertically (10)
      // Math.abs ensures our step is always a positive number so we can scan + and - cleanly.
      let step = (Math.abs(square - aiFirstHit) % 10 === 0) ? 10 : 1;

      // 2. Wipe the old list!
      aiTargetList = [];

      // 3. SCAN FORWARD (+step)
      let nextForward = aiFirstHit;
      let forwardValid = true;
      
      // Keep moving forward as long as we see 'boom' squares
      while (userSquares[nextForward] && userSquares[nextForward].classList.contains('boom')) {
        // Stop scanning if we hit the right or bottom edge of the board!
        if (step === 1 && nextForward % 10 === 9) { forwardValid = false; break; } 
        if (step === 10 && nextForward >= 90) { forwardValid = false; break; } 
        
        nextForward += step;
      }
      
      // If we didn't hit a wall, and the square isn't already a miss, add it!
      if (forwardValid && userSquares[nextForward] && !userSquares[nextForward].classList.contains('miss')) {
        aiTargetList.push(nextForward);
      }

      // 4. SCAN BACKWARD (-step)
      let nextBackward = aiFirstHit;
      let backwardValid = true;
      
      // Keep moving backward as long as we see 'boom' squares
      while (userSquares[nextBackward] && userSquares[nextBackward].classList.contains('boom')) {
        // Stop scanning if we hit the left or top edge of the board!
        if (step === 1 && nextBackward % 10 === 0) { backwardValid = false; break; }
        if (step === 10 && nextBackward <= 9) { backwardValid = false; break; }
        
        nextBackward -= step;
      }
      
      // If we didn't hit a wall, and the square isn't already a miss, add it!
      if (backwardValid && userSquares[nextBackward] && !userSquares[nextBackward].classList.contains('miss')) {
        aiTargetList.push(nextBackward);
      }
    }

  }
  

  // Select square on computer's turn
  function selectSquare(){
    if (difficulty === 'easy') return Math.floor(Math.random() * userSquares.length);

    if (aiTargetList.length > 0) return aiTargetList.pop();
      
    aiFirstHit = null;
    return Math.floor(Math.random() * userSquares.length);
  }

  function checkForWins() {
    let enemy = 'computer'
    if(gameMode === 'multiPlayer') enemy = 'enemy'

    infoDisplay.innerHTML = ''

    if (destroyerCount === 2) {
      infoDisplay.innerHTML = `You sunk the ${enemy}'s destroyer`
      destroyerCount = 10
    }
    if (submarineCount === 3) {
      infoDisplay.innerHTML = `You sunk the ${enemy}'s submarine`
      submarineCount = 10
    }
    if (cruiserCount === 3) {
      infoDisplay.innerHTML = `You sunk the ${enemy}'s cruiser`
      cruiserCount = 10
    }
    if (battleshipCount === 4) {
      infoDisplay.innerHTML = `You sunk the ${enemy}'s battleship`
      battleshipCount = 10
    }
    if (carrierCount === 5) {
      infoDisplay.innerHTML = `You sunk the ${enemy}'s carrier`
      carrierCount = 10
    }
    if (cpuDestroyerCount === 2) {
      infoDisplay.innerHTML = `${enemy} sunk your destroyer`
      cpuDestroyerCount = 10
    }
    if (cpuSubmarineCount === 3) {
      infoDisplay.innerHTML = `${enemy} sunk your submarine`
      cpuSubmarineCount = 10
    }
    if (cpuCruiserCount === 3) {
      infoDisplay.innerHTML = `${enemy} sunk your cruiser`
      cpuCruiserCount = 10
    }
    if (cpuBattleshipCount === 4) {
      infoDisplay.innerHTML = `${enemy} sunk your battleship`
      cpuBattleshipCount = 10
    }
    if (cpuCarrierCount === 5) {
      infoDisplay.innerHTML = `${enemy} sunk your carrier`
      cpuCarrierCount = 10
    }

    if ((destroyerCount + submarineCount + cruiserCount + battleshipCount + carrierCount) === 50) {
      infoDisplay.innerHTML = "YOU WIN"
      menuButton.style.display = 'flex'
      gameOver()
    }
    if ((cpuDestroyerCount + cpuSubmarineCount + cpuCruiserCount + cpuBattleshipCount + cpuCarrierCount) === 50) {
      infoDisplay.innerHTML = `${enemy.toUpperCase()} WINS`
      menuButton.style.display = 'flex'
      gameOver()
    }
  }

  function gameOver() {
    isGameOver = true
    startButton.removeEventListener('click', playGameSingle)
  }
})
