WATCH_DIR="./"

while true
do
    inotifywait -e modify,create,delete -r $WATCH_DIR
    echo "Alteração detectada, reiniciando servidor..."
    pkill -f "php users_api.php"
    php users_api.php &
done
