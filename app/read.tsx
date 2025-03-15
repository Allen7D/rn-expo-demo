import React, { useState } from 'react';
import { 
  Text, 
  View, 
  StyleSheet, 
  FlatList, 
  Pressable
} from 'react-native';
import { router } from 'expo-router';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';

// 阅读任务数据
interface ReadingTask {
  id: string;
  title: string;
  icon: string;
  color: string;
  pdfPath: string;
  completed: boolean;
}

interface DayTask {
  day: string;
  title: string;
  progress: number;
  tasks: ReadingTask[];
  unlocked: boolean;
}

// 模拟数据 - 实际应用中可从API或本地存储获取
const generateDummyData = (): DayTask[] => {
  const days: DayTask[] = [];
  
  for (let i = 1; i <= 31; i++) {
    const day = `Day${i.toString().padStart(2, '0')}`;
    const tasksCount = Math.floor(Math.random() * 3) + 1; // 1-3个子任务
    const tasks: ReadingTask[] = [];
    
    for (let j = 1; j <= tasksCount; j++) {
      const titles = [
        "早晨起床", "去上学", "我的家庭", 
        "动物朋友", "颜色世界", "食物时间",
        "我的爱好", "节日庆典", "数字游戏"
      ];
      
      const icons = [
        "book-reader", "book-open", "book",
        "pencil-alt", "school", "sun", 
        "star", "heart", "smile"
      ];
      
      const colors = [
        "#FF9AA2", "#FFDAC1", "#B5EAD7", 
        "#C7CEEA", "#F8B195", "#F67280", 
        "#355C7D", "#9DE0AD", "#FFD3B6"
      ];
      
      tasks.push({
        id: `${day}-${j}`,
        title: titles[Math.floor(Math.random() * titles.length)],
        icon: icons[Math.floor(Math.random() * icons.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
        pdfPath: "01 Waking Up.pdf", // 示例PDF路径
        completed: i < 3 && j < 3 // 前两天的前两个任务已完成
      });
    }
    
    days.push({
      day,
      title: `${day} 阅读练习`,
      progress: i <= 5 ? Math.floor(Math.random() * 100) : 0,
      tasks,
      unlocked: i <= 5 // 只有前5天解锁
    });
  }
  
  return days;
};

export default function ReadScreen() {
  const [expanded, setExpanded] = useState<string[]>(["Day01"]); // 默认展开第一天
  const [days] = useState<DayTask[]>(generateDummyData());
  
  // 处理天任务展开/折叠
  const toggleExpand = (day: string) => {
    if (expanded.includes(day)) {
      setExpanded(expanded.filter(d => d !== day));
    } else {
      setExpanded([...expanded, day]);
    }
  };
  
  // 导航到阅读详情页
  const navigateToDetail = (task: ReadingTask) => {
    router.navigate({
      pathname: '/read-detail',
      params: { 
        title: task.title,
        pdfPath: task.pdfPath
      }
    });
  };
  
  // 渲染天任务项
  const renderDayItem = ({ item }: { item: DayTask }) => {
    const isExpanded = expanded.includes(item.day);
    
    return (
      <View style={styles.dayContainer}>
        <Pressable 
          style={[
            styles.dayHeader, 
            !item.unlocked && styles.dayHeaderLocked
          ]}
          onPress={() => item.unlocked && toggleExpand(item.day)}
          disabled={!item.unlocked}
        >
          <View style={styles.dayTitleContainer}>
            <Text style={styles.dayTitle}>{item.title}</Text>
            {item.progress > 0 && (
              <View style={styles.progressContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${item.progress}%` }
                  ]} 
                />
                <Text style={styles.progressText}>{item.progress}%</Text>
              </View>
            )}
          </View>
          
          <View style={styles.dayHeaderRight}>
            {!item.unlocked && (
              <MaterialIcons name="lock" size={22} color="#888" />
            )}
            <MaterialIcons 
              name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
              size={24} 
              color="#555"
              style={{ marginLeft: 8 }}
            />
          </View>
        </Pressable>
        
        {isExpanded && item.unlocked && (
          <View style={styles.tasksContainer}>
            {item.tasks.map((task) => (
              <Pressable
                key={task.id}
                style={[styles.taskItem, { backgroundColor: task.color + '20' }]}
                onPress={() => navigateToDetail(task)}
              >
                <View style={[styles.taskIconContainer, { backgroundColor: task.color }]}>
                  <FontAwesome5 name={task.icon} size={24} color="#fff" />
                </View>
                <View style={styles.taskDetails}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskSubtitle}>点击开始阅读</Text>
                </View>
                {task.completed && (
                  <View style={styles.completedBadge}>
                    <MaterialIcons name="check-circle" size={22} color="#4CAF50" />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>每日阅读</Text>
        <Text style={styles.headerSubtitle}>坚持阅读，天天进步</Text>
      </View>
      
      <FlatList
        data={days}
        renderItem={renderDayItem}
        keyExtractor={(item) => item.day}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    backgroundColor: '#B5EAD7',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
    paddingTop: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  dayContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0f0f0',
  },
  dayHeaderLocked: {
    backgroundColor: '#f0f0f0',
    opacity: 0.7,
  },
  dayTitleContainer: {
    flex: 1,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressContainer: {
    height: 6,
    width: '80%',
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    color: '#666',
    position: 'absolute',
    right: -25,
    top: -4,
  },
  tasksContainer: {
    padding: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  taskIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskDetails: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  taskSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  completedBadge: {
    padding: 4,
  },
});
